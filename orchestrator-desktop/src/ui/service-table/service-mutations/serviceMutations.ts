import type { ServiceDto } from "../../../api/types";
import type { ToastType } from "../../toast/Toast";

export async function applyServiceMutation(
  run: () => Promise<ServiceDto[]>,
  success: string | undefined,
  onServicesUpdate?: (services: ServiceDto[]) => void,
  onToast?: (type: ToastType, message: string) => void,
  onAction?: () => Promise<void>,
) {
  try {
    const updated = await run();
    onServicesUpdate?.(updated);

    if (onAction) {
      await onAction();
    }

    if (success) {
      onToast?.("success", success);
    }
  } catch (error) {
    onToast?.("error", String(error));
  }
}

export async function withServiceBusy(
  name: string,
  setBusy: (name: string | null) => void,
  run: () => Promise<void>,
) {
  setBusy(name);
  try {
    await run();
  } finally {
    setBusy(null);
  }
}
