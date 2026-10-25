// Reviewed pinned Input/Textarea classes; browser file/selection/resize behavior requires native policy.
export const reviewedInputSources = {
  input: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/input.tsx',
      sha256: '00213ec177e4556e69b6680128c18023d859a8e4eaf4106fbcf6abdc4f2c419b',
      classes:
        'cn-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/input.tsx',
      sha256: 'df7e02c82048862d719d69c7b101de130e47f2448d3933f76317c3c853b8a01e',
      classes:
        'cn-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/input.tsx',
      sha256: 'b9596748b7238b5605f558474e9d50afc1535c5832c57134055e4bbde5fa804f',
      classes:
        'cn-input w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/input.json#registry/default/ui/input.tsx',
      sha256: 'b326e2af874b14aa2ac18096ddbec512c6258f3fafc20ba6c8262818d48e6a5b',
      classes:
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/input.json#registry/new-york/ui/input.tsx',
      sha256: '6299a6a387dc55e528aec4342deaea0b83f1ea3a365c135a31a18ee55334f441',
      classes:
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/input.tsx',
      sha256: '0c9457181f6ddc80969bcf854e92c362903a55b6e889fbef3fd85343ecc4af5b',
      classes:
        'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
    },
  },
  textarea: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/textarea.tsx',
      sha256: '8f527c89dec40a9b372376dc93d2ebb149bfd82f209856d110ead1aabec19c6a',
      classes:
        'cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/textarea.tsx',
      sha256: '8f527c89dec40a9b372376dc93d2ebb149bfd82f209856d110ead1aabec19c6a',
      classes:
        'cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/textarea.tsx',
      sha256: '522eb7b565500e9a38ada957dc86ef0a4b2273dca9af2cb92af45332e614a334',
      classes:
        'cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/textarea.json#registry/default/ui/textarea.tsx',
      sha256: 'aaf46918c590c2bf59e2afb7904dfd8e69317e12ee34ff93ed2746dd06cc994a',
      classes:
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/textarea.json#registry/new-york/ui/textarea.tsx',
      sha256: 'ec7c92aaed80f6923a7caa4bfe4eead395b50a7001504fd7fbb0b9381804dae9',
      classes:
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/textarea.tsx',
      sha256: '5cafcfeeee29534f449387a16b585f5923d2faab1a0cdc50a874416b175f59ce',
      classes:
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
    },
  },
};
