import type { TextStyle, ViewStyle } from 'react-native';

/** Reviewed utility vocabulary for native registry recipes. Unknown utilities fail closed. */
export type RegistryStyle = {
  view: ViewStyle;
  text: TextStyle;
  paint: Record<string, string | number>;
  children: string[];
  svgChildren: string[];
  descendants: string[];
  fontRole?: 'mono' | 'sans' | 'heading' | 'serif';
};
export function registryStyle(
  classes: string | undefined,
  options: {
    width: number;
    height?: number;
    mode?: 'light' | 'dark';
    styleName?: string;
    color: (value: string) => string;
    radius: number;
    index?: number;
    count?: number;
    active?: boolean;
    selected?: boolean;
    expanded?: boolean;
    checked?: boolean;
    slot?: string;
    svg?: boolean;
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
  const radiusMatch = /\[--radius:(-?\d+(?:\.\d+)?)(rem|px)\]/.exec(classes ?? '');
  const localRadius = radiusMatch
    ? Number(radiusMatch[1]) * (radiusMatch[2] === 'rem' ? 16 : 1)
    : options.radius;
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
    if (token.startsWith('dark:')) {
      if (options.mode !== 'dark') continue;
      token = token.slice(5);
    }
    const preset = /^style-(vega|nova|maia|lyra|mira|luma|sera|rhea):(.+)$/.exec(token);
    if (preset) {
      if (preset[1] !== (options.styleName ?? 'nova')) continue;
      token = preset[2]!;
    }
    const responsive = /^(sm|md|lg|xl|2xl):(.+)$/.exec(token);
    if (responsive) {
      if (
        options.width <
        ({ sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }[responsive[1]!] ?? Infinity)
      )
        continue;
      token = responsive[2]!.replace(/^!|!$/g, '');
    }
    if (token.startsWith('[&:not(:first-child)]:')) {
      if ((options.index ?? 0) === 0) continue;
      token = token.slice('[&:not(:first-child)]:'.length);
    }
    if (token.startsWith('data-[state=on]:')) {
      if (!options.selected) continue;
      token = token.slice('data-[state=on]:'.length);
    }
    if (/^\[--radius:-?\d+(?:\.\d+)?(?:rem|px)\]$/.test(token)) {
      paint.radius = number('[' + token.slice(10, -1) + ']');
      continue;
    }
    if (/^scroll-m-\d+$/.test(token)) {
      paint.webScrollMargin = number(token.slice(9));
      continue;
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
    const slot = /^data-\[slot=([^\]]+)\]:(.+)$/.exec(token);
    if (slot) {
      if (slot[1] !== options.slot) continue;
      token = slot[2]!;
    }
    if (token.startsWith('first:')) {
      if ((options.index ?? 0) !== 0) continue;
      token = token.slice(6);
    }
    if (token.startsWith('data-[active=true]:')) {
      if (!options.active) continue;
      token = token.slice(19);
    }
    if (/^group-data-\[(state=on|selected)\]\/toggle:/.test(token)) {
      if (!options.selected) continue;
      token = token.replace(/^group-data-\[(state=on|selected)\]\/toggle:/, '');
    }
    if (token.startsWith('[svg]:')) {
      if (options.svg) token = token.slice(6);
      else {
        result.svgChildren.push(token.slice(6));
        continue;
      }
    }
    if (token.startsWith('group-aria-expanded:')) {
      if (!options.expanded) continue;
      token = token.slice('group-aria-expanded:'.length);
    }
    if (token.startsWith('group-data-[state=open]:')) {
      if (!options.expanded) continue;
      token = token.slice('group-data-[state=open]:'.length);
    }
    if (token === 'group' || token.startsWith('group/')) {
      paint.group = token;
      continue;
    }
    if (token === 'sr-only') {
      Object.assign(view, {
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        opacity: 0,
      });
      continue;
    }
    if (token === 'truncate') {
      paint.lines = 1;
      continue;
    }
    if (/^line-clamp-[1-9]$/.test(token)) {
      paint.lines = Number(token.slice(11));
      continue;
    }
    if (token === 'after:absolute' || token === 'after:inset-0') {
      paint.nativePseudoBorder = 1;
      continue;
    }
    if (token === 'after:rounded-lg') {
      view.borderRadius = localRadius;
      continue;
    }
    if (token === 'after:border') {
      view.borderWidth = 1;
      continue;
    }
    if (token === 'after:border-border') {
      view.borderColor = options.color('border');
      continue;
    }
    if (token === 'after:mix-blend-darken' || token === 'after:mix-blend-lighten') {
      paint.webBlendMode = token.slice(16);
      continue;
    }
    if (token === 'hidden') view.display = 'none';
    else if (token === 'flex' || token === 'block') view.display = 'flex';
    else if (token === 'grid') {
      view.display = 'flex';
      view.flexDirection = 'column';
      paint.columns = 1;
    } else if (/^grid-cols-[1-9]$/.test(token)) {
      view.flexDirection = 'row';
      view.flexWrap = 'wrap';
      paint.columns = Number(token.slice(10));
    } else if (token === 'grid-cols-subgrid') {
      paint.subgrid = 1;
    } else if (/^col-span-(full|[1-9])$/.test(token)) {
      paint.columnSpan = token.slice(9);
    } else if (token === 'flex-row' || token === 'flex-col')
      view.flexDirection = token === 'flex-row' ? 'row' : 'column';
    else if (token === 'place-items-center') {
      view.alignItems = 'center';
      view.justifyContent = 'center';
    } else if (token === 'flex-wrap') view.flexWrap = 'wrap';
    else if (token === 'flex-1') view.flex = 1;
    else if (token === 'flex-none') {
      view.flexGrow = 0;
      view.flexShrink = 0;
    } else if (token === 'inline-flex' || token === 'inline-block' || token === 'inline')
      view.display = 'flex';
    else if (token === 'shrink-0') view.flexShrink = 0;
    else if (token === 'basis-full') view.flexBasis = '100%';
    else if (/^basis-[1-9]\/[1-9]$/.test(token)) {
      const [a, b] = token.slice(6).split('/').map(Number);
      view.flexBasis = ((100 * a!) / b! + '%') as `${number}%`;
    } else if (token.startsWith('gap-')) view.gap = number(token.slice(4));
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
      if (value !== 'center' && value !== 'start' && value !== 'end' && value !== 'between')
        throw Error(`Unsupported native justification: ${original}`);
      view.justifyContent =
        value === 'center'
          ? 'center'
          : value === 'between'
            ? 'space-between'
            : value === 'end'
              ? 'flex-end'
              : 'flex-start';
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
    } else if (
      /^w-\(--(?:radix-(?:dropdown-menu|context-menu|popover|tooltip|select)-trigger-width|anchor-width)\)$/.test(
        token,
      )
    ) {
      paint.triggerWidth = 1;
    } else if (/^(min-|max-)?(w|h|size)-/.test(token)) {
      const match = /^(min-|max-)?(w|h|size)-(.+)$/.exec(token)!;
      const names =
        match[2] === 'size' ? ['width', 'height'] : [match[2] === 'w' ? 'width' : 'height'];
      const value = /^\[\d+(?:\.\d+)?%\]$/.test(match[3]!)
        ? match[3]!.slice(1, -1)
        : /^[1-9]\/[1-9]$/.test(match[3]!)
          ? (100 * Number(match[3]!.split('/')[0])) / Number(match[3]!.split('/')[1]) + '%'
          : match[3] === 'screen'
            ? match[2] === 'w'
              ? options.width
              : (options.height ?? options.width)
            : match[3] === 'auto' || match[3] === 'fit'
              ? 'auto'
              : match[3] === 'xs'
                ? 320
                : match[3] === 'full'
                  ? '100%'
                  : /^(4|5|6|7)xl$/.test(match[3]!)
                    ? (
                        { '4xl': 1024, '5xl': 1152, '6xl': 1280, '7xl': 1440 } as Record<
                          string,
                          number
                        >
                      )[match[3]!]!
                    : match[3] === '3xl'
                      ? 768
                      : match[3] === '2xl'
                        ? 672
                        : match[3] === 'xl'
                          ? 576
                          : match[3] === 'md'
                            ? 448
                            : match[3] === 'sm'
                              ? 384
                              : match[3] === 'lg'
                                ? 512
                                : number(match[3]!);
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
      if (/^aspect-\[\d+(?:\.\d+)?\/\d+(?:\.\d+)?\]$/.test(token)) {
        const [a, b] = token.slice(8, -1).split('/').map(Number);
        if (b! > 0) view.aspectRatio = a! / b!;
      }
      if (view.aspectRatio === undefined)
        throw Error(`Unsupported native aspect ratio: ${original}`);
    } else if (token === 'absolute' || token === 'relative') view.position = token;
    else if (/^(left|top)-/.test(token)) {
      const at = token.indexOf('-');
      Object.assign(view, { [token.slice(0, at)]: number(token.slice(at + 1)) });
    } else if (token.startsWith('z-')) view.zIndex = Number(token.slice(2));
    else if (token.startsWith('opacity-')) view.opacity = Number(token.slice(8)) / 100;
    else if (token === 'rounded') view.borderRadius = 4;
    else if (token.startsWith('rounded-')) {
      const value = token.slice(8),
        fixed = {
          full: 9999,
          xs: 2,
          sm: Math.max(0, localRadius - 4),
          md: Math.max(0, localRadius - 2),
          lg: localRadius,
          xl: localRadius + 4,
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
    else if (/^border-[tblr]-\d+$/.test(token)) {
      const [, edge, amount] = token.split('-');
      Object.assign(view, {
        [{
          t: 'borderTopWidth',
          b: 'borderBottomWidth',
          l: 'borderLeftWidth',
          r: 'borderRightWidth',
        }[edge!]!]: Number(amount),
      });
      view.borderColor = options.color('border');
    } else if (token.startsWith('border-')) {
      const value = token.slice(7);
      if (/^\[\d+(\.\d+)?px\]$/.test(value)) view.borderWidth = number(value);
      else view.borderColor = options.color(value);
    } else if (token === 'shadow-none') {
      view.boxShadow = [];
      view.elevation = 0;
    } else if (token === 'shadow-md') {
      view.boxShadow = [
        { offsetX: 0, offsetY: 4, blurRadius: 6, spreadDistance: -1, color: 'rgba(0,0,0,0.1)' },
        { offsetX: 0, offsetY: 2, blurRadius: 4, spreadDistance: -2, color: 'rgba(0,0,0,0.1)' },
      ];
      view.elevation = 4;
    } else if (token === 'shadow-xl') {
      view.boxShadow = [
        { offsetX: 0, offsetY: 20, blurRadius: 25, spreadDistance: -5, color: 'rgba(0,0,0,0.1)' },
        { offsetX: 0, offsetY: 8, blurRadius: 10, spreadDistance: -6, color: 'rgba(0,0,0,0.1)' },
      ];
      view.elevation = 8;
    } else if (/^ring-\d+$/.test(token)) paint.ringWidth = Number(token.slice(5));
    else if (token.startsWith('ring-')) paint.ringColor = options.color(token.slice(5));
    else if (token === 'italic') text.fontStyle = 'italic';
    else if (token === 'grayscale') paint.grayscale = 1;
    else if (/^brightness-(?:\d+|\[\d+(?:\.\d+)?\])$/.test(token)) {
      const value = token.slice(11);
      paint.brightness = value.startsWith('[') ? Number(value.slice(1, -1)) : Number(value) / 100;
    } else if (/^object-(cover|contain|fill)$/.test(token)) paint.objectFit = token.slice(7);
    else if (token === 'animate-spin') paint.spin = 1;
    else if (token.startsWith('hover:bg-')) paint.hoverBackground = options.color(token.slice(9));
    else if (token.startsWith('hover:text-'))
      paint.hoverForeground = options.color(token.slice(11));
    else if (token === 'transition-transform') {
      paint.turnTransition = 1;
      paint.transitionDuration = 150;
    } else if (token === 'rotate-90') paint.turnAngle = 90;
    else if (token === 'transition-none') paint.transitionDuration = 0;
    else if (token === 'transition-all') paint.transitionDuration = 150;
    else if (token === 'ease-in-out') paint.transitionEasing = 'in-out';
    else if (token === 'hover:-translate-y-0.5') paint.hoverTranslateY = -2;
    else if (['font-mono', 'font-sans', 'font-serif', 'font-heading'].includes(token))
      result.fontRole = token.slice(5) as RegistryStyle['fontRole'];
    else if (
      token === 'font-extrabold' ||
      token === 'font-bold' ||
      token === 'font-semibold' ||
      token === 'font-medium' ||
      token === 'font-normal'
    )
      text.fontWeight =
        token === 'font-extrabold'
          ? '800'
          : token === 'font-bold'
            ? '700'
            : token === 'font-semibold'
              ? '600'
              : token === 'font-medium'
                ? '500'
                : '400';
    else if (/^leading-\d+$/.test(token)) text.lineHeight = number(token.slice(8));
    else if (token === 'leading-none') paint.lineHeightMultiplier = 1;
    else if (token === 'leading-tight') paint.lineHeightMultiplier = 1.25;
    else if (token === 'leading-normal') paint.lineHeightMultiplier = 1.5;
    else if (token === 'leading-relaxed') paint.lineHeightMultiplier = 1.625;
    else if (token === 'tracking-normal') text.letterSpacing = 0;
    else if (token === 'tracking-tight') paint.letterSpacingEm = -0.025;
    else if (token === 'tracking-wide') paint.letterSpacingEm = 0.05;
    else if (token === 'text-pretty' || token === 'text-balance') {
      paint.textBreakStrategy = token === 'text-pretty' ? 'highQuality' : 'balanced';
    } else if (token === 'tabular-nums') text.fontVariant = ['tabular-nums'];
    else if (token === 'capitalize') text.textTransform = 'capitalize';
    else if (token === 'normal-case') text.textTransform = 'none';
    else if (token === 'uppercase' || token === 'lowercase') text.textTransform = token;
    else if (token.startsWith('text-')) {
      const value = token.slice(5),
        sizes = {
          xs: [12, 16],
          sm: [14, 20],
          lg: [18, 28],
          xl: [20, 28],
          '2xl': [24, 32],
          '3xl': [30, 36],
          '4xl': [36, 40],
        };
      if (value in sizes) {
        const [fontSize, lineHeight] = sizes[value as keyof typeof sizes];
        text.fontSize = fontSize;
        text.lineHeight = lineHeight;
      } else if (/^\[\d+(?:\.\d+)?(?:rem|px)\]$/.test(value)) {
        text.fontSize = number(value);
        text.lineHeight = text.fontSize * 1.5;
      } else if (value === 'left' || value === 'center' || value === 'right' || value === 'justify')
        text.textAlign = value;
      else text.color = options.color(value);
    } else if (token.startsWith('bg-')) view.backgroundColor = options.color(token.slice(3));
    else if (token === 'fill-none') paint.fill = 'none';
    else if (token.startsWith('fill-')) paint.fill = options.color(token.slice(5));
    else if (/^stroke-\d+(?:\.\d+)?$/.test(token)) paint.strokeWidth = Number(token.slice(7));
    else if (token === 'stroke-transparent') paint.stroke = 'transparent';
    else if (token === 'stroke-none') paint.stroke = 'none';
    else if (token.startsWith('stroke-')) paint.stroke = options.color(token.slice(7));
    else if (token === '-scale-x-100')
      view.transform = [...((view.transform as []) ?? []), { scaleX: -1 }];
    else if (token === '-translate-y-2')
      view.transform = [...((view.transform as []) ?? []), { translateY: -8 }];
    else if (token === 'rotate-[-40deg]')
      view.transform = [...((view.transform as []) ?? []), { rotate: '-40deg' }];
    else if (token === 'mix-blend-luminosity') view.mixBlendMode = 'luminosity';
    else if (token.startsWith('-space-x-')) paint.childMarginStart = -number(token.slice(9));
    else if (token.startsWith('space-x-')) view.columnGap = number(token.slice(8));
    else if (token.startsWith('space-y-')) view.rowGap = number(token.slice(8));
    else if (token === 'overflow-x-auto') paint.scrollHorizontal = 1;
    else if (token === 'resize-none') paint.nativeResize = 'none';
    else throw Error(`Unreviewed native registry utility: ${original}`);
  }
  if (typeof paint.ringWidth === 'number')
    view.boxShadow = [
      ...((view.boxShadow as []) ?? []),
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: paint.ringWidth,
        color: String(paint.ringColor ?? options.color('ring')),
      },
    ];
  if (typeof paint.lineHeightMultiplier === 'number' && text.fontSize)
    text.lineHeight = text.fontSize * paint.lineHeightMultiplier;
  return result;
}
