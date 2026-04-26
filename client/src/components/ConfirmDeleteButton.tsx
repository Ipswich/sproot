import {
  ActionIcon,
  Button,
  type ActionIconProps,
  type ButtonProps,
} from "@mantine/core";
import { IconCheck, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type ConfirmDeleteButtonProps =
  | {
      kind?: "button";
      onConfirm: () => void | Promise<void>;
      children?: ReactNode;
      confirmLabel?: ReactNode;
      cooldownMs?: number;
      disabled?: boolean;
      loading?: boolean;
      buttonProps?: Omit<
        ButtonProps,
        "children" | "onClick" | "color" | "disabled" | "loading"
      >;
    }
  | {
      kind: "icon";
      onConfirm: () => void | Promise<void>;
      confirmLabel?: ReactNode;
      cooldownMs?: number;
      disabled?: boolean;
      loading?: boolean;
      icon?: ReactNode;
      confirmIcon?: ReactNode;
      actionIconProps?: Omit<
        ActionIconProps,
        "children" | "onClick" | "color" | "disabled" | "loading"
      >;
    };

export default function ConfirmDeleteButton(props: ConfirmDeleteButtonProps) {
  const cooldownMs = props.cooldownMs ?? 1000;
  const timeoutRef = useRef<number | null>(null);
  const [confirmationState, setConfirmationState] = useState<
    "idle" | "cooldown" | "ready"
  >("idle");

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const resetConfirmation = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setConfirmationState("idle");
  };

  const startConfirmation = () => {
    resetConfirmation();
    setConfirmationState("cooldown");
    timeoutRef.current = window.setTimeout(() => {
      setConfirmationState("ready");
      timeoutRef.current = null;
    }, cooldownMs);
  };

  const handleClick = async () => {
    if (props.loading || props.disabled) {
      return;
    }

    if (confirmationState === "idle") {
      startConfirmation();
      return;
    }

    if (confirmationState === "cooldown") {
      return;
    }

    try {
      await props.onConfirm();
    } finally {
      resetConfirmation();
    }
  };

  const isConfirming = confirmationState !== "idle";
  const isCoolingDown = confirmationState === "cooldown";
  const color = isConfirming ? "grape" : "red";
  const disabled = props.disabled || props.loading || isCoolingDown;
  const loadingProps =
    props.loading === undefined ? {} : { loading: props.loading };

  if (props.kind === "icon") {
    return (
      <ActionIcon
        color={color}
        variant="filled"
        aria-label={isConfirming ? "Confirm delete" : "Delete"}
        onClick={() => {
          void handleClick();
        }}
        disabled={disabled}
        {...loadingProps}
        {...props.actionIconProps}
      >
        {isConfirming
          ? (props.confirmIcon ?? <IconCheck size={16} />)
          : (props.icon ?? <IconTrash size={16} />)}
      </ActionIcon>
    );
  }

  return (
    <Button
      type="button"
      color={color}
      onClick={() => {
        void handleClick();
      }}
      disabled={disabled}
      {...loadingProps}
      {...props.buttonProps}
    >
      {isConfirming
        ? (props.confirmLabel ?? "Confirm")
        : (props.children ?? "Delete")}
    </Button>
  );
}
