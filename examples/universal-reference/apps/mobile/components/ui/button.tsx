import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

type ButtonProps = Omit<PressableProps, 'children'> & { children: string; className?: string };

export function Button({ children, className, ...props }: ButtonProps) {
  return <Pressable accessibilityRole="button" className={cn('h-10 items-center justify-center rounded-md bg-primary px-4', className)} {...props}>
    <Text className="font-medium text-primary-foreground">{children}</Text>
  </Pressable>;
}
