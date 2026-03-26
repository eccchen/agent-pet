import {
  createOkxSkillWalletHost,
  type CreateOkxSkillWalletHostInput,
  type OkxSkillWalletHost,
  type SkillInvoker,
} from "./okx-skill-bridge.js";

export type OpenClawSkillInvocation = Readonly<{
  skill: string;
  operation: string;
  payload?: Record<string, unknown>;
}>;

export type OpenClawHostSkillInvoker = Readonly<{
  invokeSkill<T>(input: OpenClawSkillInvocation): Promise<T>;
}>;

export type OpenClawHostSkillInvokeFn = <T>(input: OpenClawSkillInvocation) => Promise<T>;

export type CreateOpenClawHostSkillInvokerInput =
  | OpenClawHostSkillInvoker
  | OpenClawHostSkillInvokeFn;

export type CreateOkxOpenClawWalletHostInput = Omit<CreateOkxSkillWalletHostInput, "invoker"> &
  Readonly<{
    host: CreateOpenClawHostSkillInvokerInput;
  }>;

function resolveInvokeSkill(host: CreateOpenClawHostSkillInvokerInput): OpenClawHostSkillInvokeFn {
  if (typeof host === "function") {
    return host;
  }

  return host.invokeSkill.bind(host);
}

export function createOpenClawHostSkillInvoker(
  host: CreateOpenClawHostSkillInvokerInput,
): SkillInvoker {
  const invokeSkill = resolveInvokeSkill(host);

  return {
    invoke<T>(skill: string, action: string, payload?: Record<string, unknown>) {
      return invokeSkill<T>({
        skill,
        operation: action,
        payload,
      });
    },
  };
}

export function createOkxOpenClawWalletHost({
  host,
  ...rest
}: CreateOkxOpenClawWalletHostInput): OkxSkillWalletHost {
  return createOkxSkillWalletHost({
    ...rest,
    invoker: createOpenClawHostSkillInvoker(host),
  });
}
