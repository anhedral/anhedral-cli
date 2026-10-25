// Adapted from shadcn/ui (MIT). Reviewed Avatar source slots, size variants and styles.
export const nativeAvatarPresetSource = {
  upstream: {
    repository: 'https://github.com/shadcn-ui/ui',
    commit: '617134d5810bba521803b3ed787190bacbb80b35',
  },
  globals: {
    sha256: 'c5e271374236f23bcfd559ce64aaf6b8641ee7276156c0f803dd9cb24277af12',
    radius: { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, '2xl': 1.8, '3xl': 2.2, '4xl': 2.6 },
  },
  sources: {
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/avatar.tsx',
      sha256: '87cbda924259089cf0ecb7b29850c268e22b938ec7aba3e9c48021c535a6e6c9',
      slots: {
        Avatar: [
          {
            tag: 'div',
            classes:
              'cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
          },
        ],
        AvatarImage: [
          {
            tag: 'img',
            classes:
              'cn-avatar-image peer aspect-square size-full object-cover data-[state=error]:hidden',
          },
        ],
        AvatarFallback: [
          {
            tag: 'div',
            classes:
              'cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs peer-data-[state=error]:flex peer-[*]:hidden',
          },
        ],
        AvatarBadge: [
          {
            tag: 'span',
            classes:
              'cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
          },
        ],
        AvatarGroup: [
          {
            tag: 'div',
            classes:
              'cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
          },
        ],
        AvatarGroupCount: [
          {
            tag: 'div',
            classes:
              'cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background',
          },
        ],
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/avatar.tsx',
      sha256: 'd9850dc6f9aaccf9f7aab3c730c3aef62b42ef8cd9404b2d7133f771e14a6cbd',
      slots: {
        Avatar: [
          {
            tag: 'AvatarPrimitive.Root',
            classes:
              'cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
          },
        ],
        AvatarImage: [
          {
            tag: 'AvatarPrimitive.Image',
            classes: 'cn-avatar-image aspect-square size-full object-cover',
          },
        ],
        AvatarFallback: [
          {
            tag: 'AvatarPrimitive.Fallback',
            classes:
              'cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs',
          },
        ],
        AvatarBadge: [
          {
            tag: 'span',
            classes:
              'cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
          },
        ],
        AvatarGroup: [
          {
            tag: 'div',
            classes:
              'cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
          },
        ],
        AvatarGroupCount: [
          {
            tag: 'div',
            classes:
              'cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background',
          },
        ],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/avatar.json#registry/default/ui/avatar.tsx',
      sha256: 'e78b35ed76c67d8ff50603fbe0dfa4fe600097bd860d89e65beea3e16683dad8',
      slots: {
        Avatar: [
          {
            tag: 'AvatarPrimitive.Root',
            classes: 'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
          },
        ],
        AvatarImage: [{ tag: 'AvatarPrimitive.Image', classes: 'aspect-square h-full w-full' }],
        AvatarFallback: [
          {
            tag: 'AvatarPrimitive.Fallback',
            classes: 'flex h-full w-full items-center justify-center rounded-full bg-muted',
          },
        ],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/avatar.json#registry/new-york/ui/avatar.tsx',
      sha256: 'e78b35ed76c67d8ff50603fbe0dfa4fe600097bd860d89e65beea3e16683dad8',
      slots: {
        Avatar: [
          {
            tag: 'AvatarPrimitive.Root',
            classes: 'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
          },
        ],
        AvatarImage: [{ tag: 'AvatarPrimitive.Image', classes: 'aspect-square h-full w-full' }],
        AvatarFallback: [
          {
            tag: 'AvatarPrimitive.Fallback',
            classes: 'flex h-full w-full items-center justify-center rounded-full bg-muted',
          },
        ],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/avatar.tsx',
      sha256: '0c5c48b8a1dff4fdc5ff9b6cb79cc9cd138682b7d86868068f571befe9675e88',
      slots: {
        Avatar: [
          {
            tag: 'AvatarPrimitive.Root',
            classes:
              'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6',
          },
        ],
        AvatarImage: [{ tag: 'AvatarPrimitive.Image', classes: 'aspect-square size-full' }],
        AvatarFallback: [
          {
            tag: 'AvatarPrimitive.Fallback',
            classes:
              'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs',
          },
        ],
        AvatarBadge: [
          {
            tag: 'span',
            classes:
              'absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
          },
        ],
        AvatarGroup: [
          {
            tag: 'div',
            classes:
              'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
          },
        ],
        AvatarGroupCount: [
          {
            tag: 'div',
            classes:
              'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
          },
        ],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/avatar.tsx',
      sha256: 'a85a03da4dba7e7efc440f28fe93408f776fd6fc6390cf68a16faafa790ff724',
      slots: {
        Avatar: [
          {
            tag: 'AvatarPrimitive.Root',
            classes:
              'cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
          },
        ],
        AvatarImage: [
          {
            tag: 'AvatarPrimitive.Image',
            classes: 'cn-avatar-image aspect-square size-full object-cover',
          },
        ],
        AvatarFallback: [
          {
            tag: 'AvatarPrimitive.Fallback',
            classes:
              'cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs',
          },
        ],
        AvatarBadge: [
          {
            tag: 'span',
            classes:
              'cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
          },
        ],
        AvatarGroup: [
          {
            tag: 'div',
            classes:
              'cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
          },
        ],
        AvatarGroupCount: [
          {
            tag: 'div',
            classes:
              'cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background',
          },
        ],
      },
    },
  },
  presets: {
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-xs group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-xs/relaxed group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        avatar:
          'size-8 rounded-full after:rounded-full data-[size=lg]:size-10 data-[size=sm]:size-6',
        'avatar-fallback': 'bg-muted text-muted-foreground rounded-full',
        'avatar-image': 'rounded-full',
        'avatar-badge': 'bg-primary text-primary-foreground ring-background',
        'avatar-group-count':
          'bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      },
    },
  },
} as const;
