import type { TextStyle, ViewStyle } from 'react-native';

/** Reviewed utility vocabulary for native registry recipes. Unknown utilities fail closed. */
export type RegistryStyle = {
  view: ViewStyle;
  text: TextStyle;
  paint: Record<string, string | number>;
  children: string[];
  svgChildren: string[];
  descendants: string[];
  fontRole?: 'mono';
};
export function registryStyle(
  classes: string | undefined,
  options: {
    width: number;
    color: (value: string) => string;
    radius: number;
    index?: number;
    count?: number;
    active?: boolean;
  },
): RegistryStyle {
  const result: RegistryStyle = {
    view: {},
    text: {},
    paint: {},
    children: [],
    svgChildren: [],
    descendants: [],
  };
  const { view, text, paint } = result;
  const number = (value: string): number => {
    if (value.startsWith('[') && value.endsWith(']')) {
      const raw = value.slice(1, -1);
      if (/^-?\d+(\.\d+)?(px|rem)?$/.test(raw))
        return parseFloat(raw) * (raw.endsWith('rem') ? 16 : 1);
    } else if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * 4;
    throw Error(`Unsupported native registry length: ${value}`);
  };
  for (const original of (classes?.split(/\s+/).filter(Boolean) ?? []).sort(
    (a, b) => Number(/(?:^|:)!|!$/.test(a)) - Number(/(?:^|:)!|!$/.test(b)),
  )) {
    let token = original.replace(/^!|!$/g, '');
    const responsive = /^(sm|md|lg):(.+)$/.exec(token);
    if (responsive) {
      if (options.width < ({ sm: 640, md: 768, lg: 1024 }[responsive[1]!] ?? Infinity)) continue;
      token = responsive[2]!.replace(/^!|!$/g, '');
    }
    if (token.startsWith('[&>div]:')) {
      result.children.push(token.slice('[&>div]:'.length));
      continue;
    }
    if (token.startsWith('[&>svg]:')) {
      result.svgChildren.push(token.slice('[&>svg]:'.length));
      continue;
    }
    if (token.startsWith('[&>*]:')) {
      result.children.push(token.slice('[&>*]:'.length));
      continue;
    }
    if (token.startsWith('*:')) {
      result.children.push(token.slice(2));
      continue;
    }
    if (token === '[&_span]:flex') {
      result.descendants.push('span:flex');
      continue;
    }
    if (token === '[&_.recharts-text]:fill-background') {
      paint.labelFill = options.color('background');
      continue;
    }
    if (token === '[&_.recharts-pie-label-text]:fill-foreground') {
      paint.pieLabelFill = options.color('foreground');
      continue;
    }
    if (token.startsWith('first:fill-')) {
      paint.firstFill = options.color(token.slice(11));
      continue;
    }
    if (token.startsWith('last:fill-')) {
      paint.lastFill = options.color(token.slice(10));
      continue;
    }
    if (token.startsWith('even:')) {
      if (((options.index ?? 0) + 1) % 2 !== 0) continue;
      token = token.slice(5);
    }
    if (token.startsWith('data-[active=true]:')) {
      if (!options.active) continue;
      token = token.slice(19);
    }
    if (token === 'hidden') view.display = 'none';
    else if (token === 'flex') view.display = 'flex';
    else if (token === 'grid') {
      view.display = 'flex';
      view.flexDirection = 'column';
    } else if (token === 'grid-cols-2') {
      view.flexDirection = 'row';
      view.flexWrap = 'wrap';
      paint.columns = 2;
    } else if (token === 'flex-row' || token === 'flex-col')
      view.flexDirection = token === 'flex-row' ? 'row' : 'column';
    else if (token === 'flex-wrap') view.flexWrap = 'wrap';
    else if (token === 'flex-1') view.flex = 1;
    else if (token === 'shrink-0') view.flexShrink = 0;
    else if (token === 'basis-full') view.flexBasis = '100%';
    else if (token === 'basis-1/4') view.flexBasis = '25%';
    else if (token.startsWith('gap-')) view.gap = number(token.slice(4));
    else if (token.startsWith('items-')) {
      const value = token.slice(6);
      const align = {
        center: 'center',
        start: 'flex-start',
        end: 'flex-end',
        stretch: 'stretch',
        baseline: 'baseline',
      } as const;
      if (!(value in align)) throw Error(`Unsupported native alignment: ${original}`);
      view.alignItems = align[value as keyof typeof align];
    } else if (token.startsWith('justify-')) {
      const value = token.slice(8);
      if (value !== 'center' && value !== 'start' && value !== 'between')
        throw Error(`Unsupported native justification: ${original}`);
      view.justifyContent =
        value === 'center' ? 'center' : value === 'between' ? 'space-between' : 'flex-start';
    } else if (/^(-?)(p|m)([xytrbl]?)-/.test(token)) {
      const match = /^(-?)(p|m)([xytrbl]?)-(.+)$/.exec(token)!;
      const prefix = match[2] === 'p' ? 'padding' : 'margin';
      const suffix = {
        '': [''],
        x: ['Left', 'Right'],
        y: ['Top', 'Bottom'],
        t: ['Top'],
        r: ['Right'],
        b: ['Bottom'],
        l: ['Left'],
      }[match[3]!]!;
      const value = match[4] === 'auto' ? 'auto' : number(match[4]!) * (match[1] ? -1 : 1);
      if (value === 'auto' && prefix === 'padding') throw Error('Native padding cannot be auto.');
      for (const side of suffix) Object.assign(view, { [prefix + side]: value });
    } else if (/^(min-|max-)?(w|h|size)-/.test(token)) {
      const match = /^(min-|max-)?(w|h|size)-(.+)$/.exec(token)!;
      const names =
        match[2] === 'size' ? ['width', 'height'] : [match[2] === 'w' ? 'width' : 'height'];
      const value = match[3] === 'full' ? '100%' : match[3] === 'md' ? 448 : number(match[3]!);
      for (let name of names) {
        if (match[1]) name = match[1].slice(0, -1) + name[0]!.toUpperCase() + name.slice(1);
        Object.assign(view, { [name]: value });
      }
    } else if (token.startsWith('aspect-')) {
      view.aspectRatio =
        token === 'aspect-auto'
          ? 'auto'
          : token === 'aspect-square'
            ? 1
            : token === 'aspect-video'
              ? 16 / 9
              : undefined;
      if (view.aspectRatio === undefined)
        throw Error(`Unsupported native aspect ratio: ${original}`);
    } else if (token === 'absolute' || token === 'relative') view.position = token;
    else if (/^(left|top)-/.test(token)) {
      const at = token.indexOf('-');
      Object.assign(view, { [token.slice(0, at)]: number(token.slice(at + 1)) });
    } else if (token.startsWith('z-')) view.zIndex = Number(token.slice(2));
    else if (token.startsWith('opacity-')) view.opacity = Number(token.slice(8)) / 100;
    else if (token.startsWith('rounded-')) {
      const value = token.slice(8),
        fixed = {
          xs: 2,
          sm: Math.max(0, options.radius - 4),
          lg: options.radius,
          xl: options.radius + 4,
        };
      view.borderRadius = value in fixed ? fixed[value as keyof typeof fixed] : number(value);
    } else if (
      token === 'border-t' ||
      token === 'border-b' ||
      token === 'border-l' ||
      token === 'border-t-0'
    ) {
      Object.assign(view, {
        [{
          'border-t': 'borderTopWidth',
          'border-b': 'borderBottomWidth',
          'border-l': 'borderLeftWidth',
          'border-t-0': 'borderTopWidth',
        }[token]!]: token.endsWith('-0') ? 0 : 1,
      });
      view.borderColor = options.color('border');
    } else if (token === 'border') {
      view.borderWidth = 1;
      view.borderColor = options.color('border');
    } else if (token === 'border-dashed') view.borderStyle = 'dashed';
    else if (token.startsWith('border-')) {
      const value = token.slice(7);
      if (/^\[\d+(\.\d+)?px\]$/.test(value)) view.borderWidth = number(value);
      else view.borderColor = options.color(value);
    } else if (token === 'shadow-xl') {
      view.boxShadow = [
        { offsetX: 0, offsetY: 20, blurRadius: 25, spreadDistance: -5, color: 'rgba(0,0,0,0.1)' },
        { offsetX: 0, offsetY: 8, blurRadius: 10, spreadDistance: -6, color: 'rgba(0,0,0,0.1)' },
      ];
      view.elevation = 8;
    } else if (token === 'transition-all') paint.transitionDuration = 150;
    else if (token === 'ease-in-out') paint.transitionEasing = 'in-out';
    else if (token === 'hover:-translate-y-0.5') paint.hoverTranslateY = -2;
    else if (token === 'font-mono') result.fontRole = 'mono';
    else if (token === 'font-bold' || token === 'font-medium' || token === 'font-normal')
      text.fontWeight = token === 'font-bold' ? '700' : token === 'font-medium' ? '500' : '400';
    else if (token === 'leading-none') paint.lineHeightMultiplier = 1;
    else if (token === 'tabular-nums') text.fontVariant = ['tabular-nums'];
    else if (token === 'capitalize') text.textTransform = 'capitalize';
    else if (token.startsWith('text-')) {
      const value = token.slice(5),
        sizes = {
          xs: [12, 16],
          sm: [14, 20],
          lg: [18, 28],
          '2xl': [24, 32],
          '3xl': [30, 36],
          '4xl': [36, 40],
        };
      if (value in sizes) {
        const [fontSize, lineHeight] = sizes[value as keyof typeof sizes];
        text.fontSize = fontSize;
        text.lineHeight = lineHeight;
      } else if (value === 'left' || value === 'center') text.textAlign = value;
      else text.color = options.color(value);
    } else if (token.startsWith('bg-')) view.backgroundColor = options.color(token.slice(3));
    else if (token.startsWith('fill-')) paint.fill = options.color(token.slice(5));
    else if (token === 'stroke-2') paint.strokeWidth = 2;
    else if (token === 'stroke-transparent') paint.stroke = 'transparent';
    else if (token === '-scale-x-100')
      view.transform = [...((view.transform as []) ?? []), { scaleX: -1 }];
    else if (token === '-translate-y-2')
      view.transform = [...((view.transform as []) ?? []), { translateY: -8 }];
    else if (token === 'rotate-[-40deg]')
      view.transform = [...((view.transform as []) ?? []), { rotate: '-40deg' }];
    else if (token === 'mix-blend-luminosity') view.mixBlendMode = 'luminosity';
    else if (token === 'space-y-0') view.rowGap = 0;
    else throw Error(`Unreviewed native registry utility: ${original}`);
  }
  if (paint.lineHeightMultiplier && text.fontSize) text.lineHeight = text.fontSize;
  return result;
}
