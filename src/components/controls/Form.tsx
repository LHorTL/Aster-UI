import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../primitives";

/** 表单字段校验规则。 */
export type AfFormRule<V = unknown> = {
  /** 是否必填。 */
  required?: boolean;
  /** 最小长度（字符串/数组）或最小值（数字）。 */
  min?: number;
  /** 最大长度（字符串/数组）或最大值（数字）。 */
  max?: number;
  /** 正则匹配规则。 */
  pattern?: RegExp;
  /** 校验失败时的错误文案。 */
  message?: string;
  /** 自定义同步或异步校验器；抛出异常或返回非空字符串表示失败。 */
  validator?: (value: V) => void | string | Promise<void | string>;
};

/** 表单实例控制句柄（与 `useAfForm` 配合）。 */
export type AfFormInstance<T extends Record<string, unknown> = Record<string, unknown>> = {
  getFieldValue: <K extends keyof T & string>(name: K) => T[K];
  getFieldsValue: () => T;
  setFieldValue: <K extends keyof T & string>(name: K, value: T[K]) => void;
  setFieldsValue: (values: Partial<T>) => void;
  resetFields: (names?: string[]) => void;
  validateFields: (names?: string[]) => Promise<T>;
  submit: () => void;
  getFieldError: (name: string) => string | undefined;
  /** @internal 供 `AfForm` 与 `AfFormItem` 注册字段并订阅变更。 */
  _internal: AfFormStoreInternal<T>;
};

type FieldRegistration = {
  rules: AfFormRule[];
  getFocusTarget: () => HTMLElement | null;
};

type AfFormStoreInternal<T extends Record<string, unknown>> = {
  subscribe: (listener: () => void) => () => void;
  registerField: (name: string, reg: FieldRegistration) => () => void;
  setInitialValues: (values: Partial<T>) => void;
  setCallbacks: (callbacks: {
    onFinish?: (values: T) => void;
    onFinishFailed?: (errorInfo: { values: T; errorFields: { name: string; errors: string[] }[] }) => void;
    onValuesChange?: (changed: Partial<T>, allValues: T) => void;
  }) => void;
  touchField: (name: string) => void;
  isTouched: (name: string) => boolean;
  validateSingle: (name: string) => Promise<string | undefined>;
  handleValueInput: (name: string, nextValue: unknown) => void;
  handleFieldBlur: (name: string) => void;
  submitForm: () => Promise<void>;
};

function runRule(value: unknown, rule: AfFormRule): string | Promise<string | undefined> | undefined {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);

  if (rule.required && isEmpty) {
    return rule.message ?? "此项为必填";
  }
  if (!isEmpty && rule.min !== undefined) {
    if (typeof value === "number" && value < rule.min) return rule.message ?? `不能小于 ${rule.min}`;
    if ((typeof value === "string" || Array.isArray(value)) && value.length < rule.min) {
      return rule.message ?? `至少需要 ${rule.min} 项或字符`;
    }
  }
  if (!isEmpty && rule.max !== undefined) {
    if (typeof value === "number" && value > rule.max) return rule.message ?? `不能大于 ${rule.max}`;
    if ((typeof value === "string" || Array.isArray(value)) && value.length > rule.max) {
      return rule.message ?? `最多允许 ${rule.max} 项或字符`;
    }
  }
  if (!isEmpty && rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
    return rule.message ?? "格式不符合要求";
  }
  if (rule.validator) {
    try {
      const res = rule.validator(value);
      if (res && typeof (res as Promise<unknown>).then === "function") {
        return (res as Promise<void | string>).then(
          (msg) => (typeof msg === "string" && msg ? msg : undefined),
          (err: unknown) => (err instanceof Error ? err.message : String(err || rule.message || "校验失败")),
        );
      }
      if (typeof res === "string" && res) return res;
    } catch (err) {
      return err instanceof Error ? err.message : String(err || rule.message || "校验失败");
    }
  }
  return undefined;
}

function createFormStore<T extends Record<string, unknown>>(initial?: Partial<T>): AfFormInstance<T> {
  let initialSnapshot: Record<string, unknown> = { ...(initial ?? {}) };
  let values: Record<string, unknown> = { ...(initial ?? {}) };
  let errors: Record<string, string | undefined> = {};
  const touched = new Set<string>();
  const validationSeq = new Map<string, number>();
  const fields = new Map<string, FieldRegistration>();
  const listeners = new Set<() => void>();
  let callbacks: {
    onFinish?: (v: T) => void;
    onFinishFailed?: (errorInfo: { values: T; errorFields: { name: string; errors: string[] }[] }) => void;
    onValuesChange?: (changed: Partial<T>, allValues: T) => void;
  } = {};

  const notify = () => {
    listeners.forEach((fn) => fn());
  };

  const validateSingle = async (name: string): Promise<string | undefined> => {
    const reg = fields.get(name);
    if (!reg || reg.rules.length === 0) {
      if (errors[name]) {
        errors = { ...errors, [name]: undefined };
        notify();
      }
      return undefined;
    }
    const seq = (validationSeq.get(name) ?? 0) + 1;
    validationSeq.set(name, seq);
    const val = values[name];

    let foundError: string | undefined;
    for (const rule of reg.rules) {
      const outcome = runRule(val, rule);
      const resolved = typeof outcome === "string" || outcome === undefined ? outcome : await outcome;
      // 若并发请求已产生更新版本的校验，丢弃过期结果避免竞态闪烁
      if (validationSeq.get(name) !== seq) return errors[name];
      if (resolved) {
        foundError = resolved;
        break;
      }
    }

    if (errors[name] !== foundError) {
      errors = { ...errors, [name]: foundError };
      notify();
    }
    return foundError;
  };

  const validateFields = async (names?: string[]): Promise<T> => {
    const targetNames = names ?? Array.from(fields.keys());
    targetNames.forEach((name) => touched.add(name));
    const results = await Promise.all(targetNames.map(async (name) => ({ name, error: await validateSingle(name) })));
    const errorFields = results.filter((r) => Boolean(r.error)).map((r) => ({ name: r.name, errors: [r.error as string] }));
    if (errorFields.length > 0) {
      const firstReg = fields.get(errorFields[0].name);
      const focusEl = firstReg?.getFocusTarget();
      focusEl?.focus({ preventScroll: false });
      throw { values: { ...values } as T, errorFields };
    }
    return { ...values } as T;
  };

  const submitForm = async () => {
    try {
      const validated = await validateFields();
      callbacks.onFinish?.(validated);
    } catch (err) {
      const errorInfo = err as { values: T; errorFields: { name: string; errors: string[] }[] };
      callbacks.onFinishFailed?.(errorInfo);
    }
  };

  return {
    getFieldValue: (name) => values[name] as T[typeof name],
    getFieldsValue: () => ({ ...values }) as T,
    setFieldValue: (name, value) => {
      values = { ...values, [name]: value };
      callbacks.onValuesChange?.({ [name]: value } as unknown as Partial<T>, { ...values } as T);
      if (errors[name]) {
        void validateSingle(name);
      } else {
        notify();
      }
    },
    setFieldsValue: (patch) => {
      values = { ...values, ...patch };
      callbacks.onValuesChange?.(patch, { ...values } as T);
      for (const k of Object.keys(patch)) {
        if (errors[k]) void validateSingle(k);
      }
      notify();
    },
    resetFields: (names) => {
      const list = names ?? Array.from(new Set([...Object.keys(values), ...fields.keys()]));
      const nextValues = { ...values };
      const nextErrors = { ...errors };
      for (const k of list) {
        if (k in initialSnapshot) nextValues[k] = initialSnapshot[k];
        else delete nextValues[k];
        delete nextErrors[k];
        touched.delete(k);
        validationSeq.set(k, (validationSeq.get(k) ?? 0) + 1);
      }
      values = nextValues;
      errors = nextErrors;
      notify();
    },
    validateFields,
    submit: () => {
      void submitForm();
    },
    getFieldError: (name) => errors[name],
    _internal: {
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      registerField: (name, reg) => {
        fields.set(name, reg);
        return () => {
          fields.delete(name);
        };
      },
      setInitialValues: (init) => {
        initialSnapshot = { ...init };
        for (const [k, v] of Object.entries(init)) {
          if (values[k] === undefined) values[k] = v;
        }
      },
      setCallbacks: (cb) => {
        callbacks = cb;
      },
      touchField: (name) => {
        touched.add(name);
      },
      isTouched: (name) => touched.has(name),
      validateSingle,
      handleValueInput: (name, nextValue) => {
        values = { ...values, [name]: nextValue };
        callbacks.onValuesChange?.({ [name]: nextValue } as unknown as Partial<T>, { ...values } as T);
        // 输入期间：已有错态时即时重验并消错；未失焦编辑前不提前报错
        if (errors[name]) {
          void validateSingle(name);
        } else {
          notify();
        }
      },
      handleFieldBlur: (name) => {
        if (!touched.has(name)) return;
        void validateSingle(name);
      },
      submitForm,
    },
  };
}

/** 创建并维护表单控制实例（兼容 `Form.useForm` 契约）。 */
export function useAfForm<T extends Record<string, unknown> = Record<string, unknown>>(
  initialValues?: Partial<T>,
): AfFormInstance<T> {
  const ref = useRef<AfFormInstance<T> | null>(null);
  if (!ref.current) {
    ref.current = createFormStore<T>(initialValues);
  }
  return ref.current;
}

const AfFormContext = createContext<AfFormInstance | null>(null);

/** 表单容器属性。 */
export type AfFormProps<T extends Record<string, unknown> = Record<string, unknown>> = Omit<
  ComponentPropsWithoutRef<"form">,
  "onSubmit"
> & {
  /** 外部注入的表单实例。 */
  form?: AfFormInstance<T>;
  /** 布局方向：纵向（默认）、横向双列、行内排列。 */
  layout?: "vertical" | "horizontal" | "inline";
  /** 初始默认值集合。 */
  initialValues?: Partial<T>;
  /** 全部校验通过后提交回调。 */
  onFinish?: (values: T) => void;
  /** 存在字段校验失败时的提交回调。 */
  onFinishFailed?: (errorInfo: { values: T; errorFields: { name: string; errors: string[] }[] }) => void;
  /** 任意字段变更回调。 */
  onValuesChange?: (changed: Partial<T>, allValues: T) => void;
  /** 禁用浏览器的气泡校验，统一使用 affectUI 行内反馈（默认 true）。 */
  noValidate?: boolean;
  /** 子节点。 */
  children?: ReactNode;
};

/** 表单字段单项属性。 */
export type AfFormItemProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** 字段键名。 */
  name?: string;
  /** 字段标签。 */
  label?: ReactNode;
  /** 辅助说明文字。 */
  hint?: ReactNode;
  /** 校验规则数组。 */
  rules?: AfFormRule[];
  /** 是否显示必填标记（未显式传时自动从 `rules` 推导）。 */
  required?: boolean;
  /** 绑定子节点的值属性名，默认 `"value"`。 */
  valuePropName?: string;
  /** 绑定子节点的变更事件名，默认 `"onChange"`。 */
  trigger?: string;
  /** 子控件元素或渲染函数。 */
  children?: ReactNode | ((ctx: { invalid: boolean; error?: string }) => ReactNode);
};

function extractInputValue(arg: unknown, valuePropName: string): unknown {
  if (arg && typeof arg === "object" && "target" in arg && (arg as { target?: unknown }).target) {
    const target = (arg as { target: HTMLInputElement }).target;
    if (valuePropName === "checked") return Boolean(target.checked);
    return target.value;
  }
  return arg;
}

/** 表单受控字段包裹：自动注入值、失焦校验、修复即清错与条件式 `aria-describedby` 错误播报。 */
export function AfFormItem({
  name,
  label,
  hint,
  rules = [],
  required,
  valuePropName = "value",
  trigger = "onChange",
  className,
  children,
  ...rest
}: AfFormItemProps) {
  const form = useContext(AfFormContext);
  const autoId = useId();
  const controlRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  const isRequired = required ?? rules.some((r) => Boolean(r.required));
  const hintId = `${autoId}-hint`;
  const errorId = `${autoId}-error`;

  useEffect(() => {
    if (!form) return;
    return form._internal.subscribe(() => setTick((t) => t + 1));
  }, [form]);

  useEffect(() => {
    if (!form || !name) return;
    return form._internal.registerField(name, {
      rules,
      getFocusTarget: () => {
        const container = controlRef.current;
        if (!container) return null;
        return container.querySelector<HTMLElement>("input, textarea, select, [tabindex]:not([tabindex='-1']), button");
      },
    });
  }, [form, name, rules]);

  const errorText = form && name ? form.getFieldError(name) : undefined;
  const hasError = Boolean(errorText);
  const hasHint = hint !== undefined && hint !== null && hint !== "";
  // 严格遵守：错误元素未激活时既不渲染在 DOM 中，也不被 aria-describedby 引用
  const describedBy = [hasHint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(" ") || undefined;

  let renderedControl: ReactNode = typeof children === "function" ? children({ invalid: hasError, error: errorText }) : children;
  const resolvedControlId =
    (isValidElement(renderedControl) && typeof (renderedControl.props as { id?: unknown }).id === "string"
      ? (renderedControl.props as { id: string }).id
      : undefined) ?? autoId;

  if (form && name && isValidElement(renderedControl)) {
    const el = renderedControl as ReactElement<Record<string, unknown>>;
    const currentValue = form.getFieldValue(name);
    const originalTrigger = el.props[trigger] as ((...args: unknown[]) => void) | undefined;
    const originalBlur = el.props.onBlur as ((...args: unknown[]) => void) | undefined;

    const injectedProps: Record<string, unknown> = {
      id: resolvedControlId,
      invalid: el.props.invalid ?? hasError,
      required: el.props.required ?? (isRequired || undefined),
      "aria-invalid": hasError ? true : "false",
      "aria-describedby": el.props["aria-describedby"] ?? describedBy,
      [valuePropName]: currentValue === undefined ? (valuePropName === "checked" ? false : "") : currentValue,
      [trigger]: (...args: unknown[]) => {
        const nextVal = extractInputValue(args[0], valuePropName);
        form._internal.touchField(name);
        form._internal.handleValueInput(name, nextVal);
        originalTrigger?.(...args);
      },
      onBlur: (...args: unknown[]) => {
        form._internal.handleFieldBlur(name);
        originalBlur?.(...args);
      },
    };
    renderedControl = cloneElement(el, injectedProps);
  }

  return (
    <div className={cn("af-form-item", className)} data-invalid={hasError || undefined} {...rest}>
      {label !== undefined && label !== null ? (
        <label className="af-form-item__label" htmlFor={resolvedControlId}>
          {label}
          {isRequired ? (
            <span className="af-form-item__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="af-form-item__main">
        <div ref={controlRef} className="af-form-item__control">
          {renderedControl}
        </div>
        {hasHint ? (
          <span id={hintId} className="af-form-item__hint">
            {hint}
          </span>
        ) : null}
        {hasError ? (
          <span id={errorId} className="af-form-item__error" role="alert" aria-live="polite">
            {errorText}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const AfFormInner = forwardRef<HTMLFormElement, AfFormProps<Record<string, unknown>>>(function AfForm(
  {
    form: formProp,
    layout = "vertical",
    initialValues,
    onFinish,
    onFinishFailed,
    onValuesChange,
    noValidate = true,
    className,
    children,
    ...rest
  },
  ref,
) {
  const fallbackForm = useAfForm(initialValues);
  const store = (formProp ?? fallbackForm) as AfFormInstance;

  const initAppliedRef = useRef(false);
  if (!initAppliedRef.current && initialValues) {
    store._internal.setInitialValues(initialValues);
    initAppliedRef.current = true;
  }

  useMemo(() => {
    store._internal.setCallbacks({
      onFinish: onFinish as ((values: Record<string, unknown>) => void) | undefined,
      onFinishFailed: onFinishFailed as
        | ((info: { values: Record<string, unknown>; errorFields: { name: string; errors: string[] }[] }) => void)
        | undefined,
      onValuesChange: onValuesChange as ((changed: Record<string, unknown>, all: Record<string, unknown>) => void) | undefined,
    });
  }, [store, onFinish, onFinishFailed, onValuesChange]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void store._internal.submitForm();
  };

  return (
    <AfFormContext.Provider value={store}>
      <form
        ref={ref}
        className={cn("af-form", className)}
        data-layout={layout}
        noValidate={noValidate}
        onSubmit={handleSubmit}
        {...rest}
      >
        {children}
      </form>
    </AfFormContext.Provider>
  );
});

type AfFormComponent = (<T extends Record<string, unknown> = Record<string, unknown>>(
  props: AfFormProps<T> & { ref?: Ref<HTMLFormElement> },
) => ReactElement | null) & {
  Item: typeof AfFormItem;
  useForm: typeof useAfForm;
};

/** 表单容器与状态体系：遵循失焦校验、修复即清错、提交聚焦首个错误项。 */
export const AfForm: AfFormComponent = Object.assign(
  AfFormInner as unknown as <T extends Record<string, unknown> = Record<string, unknown>>(
    props: AfFormProps<T> & { ref?: Ref<HTMLFormElement> },
  ) => ReactElement | null,
  {
    Item: AfFormItem,
    useForm: useAfForm,
  },
);
