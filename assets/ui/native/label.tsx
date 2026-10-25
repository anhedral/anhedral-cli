import { Text, type TextProps } from './text';
import { useNativeFieldPart } from './_field-context';
/** Native field context replaces browser label lookup and forwards real focus/activation. */
export function Label({
  children,
  onPress,
  controlID,
  ...props
}: TextProps & { controlID?: string }) {
  const { field, nativeID } = useNativeFieldPart('label', children, props.nativeID, controlID);
  return (
    <Text
      variant="label"
      {...props}
      nativeID={nativeID}
      accessible={props.accessible ?? !field}
      onPress={(event) => {
        onPress?.(event);
        if (event.isDefaultPrevented()) return;
        const control = controlID ? field?.controls.current.get(controlID) : field?.control.current;
        if (control?.activate) control.activate();
        else control?.focus?.();
      }}
    >
      {children}
    </Text>
  );
}
