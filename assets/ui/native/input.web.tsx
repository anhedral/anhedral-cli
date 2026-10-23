import { Input as NovaInput } from '../web/input';
import { Textarea } from '../web/textarea';
import type { InputProps } from './input';
export function Input({ value, defaultValue, onChangeText, placeholder, accessibilityLabel, secureTextEntry, keyboardType, autoComplete, autoCapitalize, editable, multiline, invalid, testID }: InputProps) {
  const shared = { value, defaultValue, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeText?.(event.target.value), placeholder, 'aria-label': accessibilityLabel, 'aria-invalid': invalid, 'data-testid': testID, disabled: editable === false, autoComplete, autoCapitalize };
  return multiline ? <Textarea {...shared} /> : <NovaInput {...shared} type={secureTextEntry ? 'password' : keyboardType === 'email-address' ? 'email' : 'text'} />;
}
