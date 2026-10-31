import {
  COMMANDS,
  GLOBAL_OPTIONS,
  commandOptions,
  commandTopic,
  type CommandDefinition,
  type CommandOption,
} from './command-schema.js';
import { CAPABILITY_IDS } from './capability-catalog.js';
import { UI_CATALOG } from './ui-catalog.js';

/** Quote data for shell source. Completion never evaluates user input. */
function quote(value: string): string {
  return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}
function words(values: readonly string[]): string {
  return values.map(quote).join(' ');
}
function nodes(): [string, CommandDefinition][] {
  const result: [string, CommandDefinition][] = [];
  function visit(topic: string[], definition: CommandDefinition): void {
    result.push([topic.join(' '), commandTopic(topic)!]);
    for (const [child, entry] of Object.entries(definition.children ?? {}))
      visit([...topic, child], entry);
  }
  for (const [name, definition] of Object.entries(COMMANDS)) visit([name], definition);
  return result;
}
function choices(definition: CommandDefinition): readonly string[] {
  if (definition.children) return Object.keys(definition.children);
  const positional = definition.positional;
  if (positional?.kind === 'capability') return CAPABILITY_IDS;
  if (positional?.kind === 'component') return UI_CATALOG.components.map((entry) => entry.name);
  return positional?.choices ?? [];
}
function optionCase(context: string, option: CommandOption): string {
  const patterns = [option.flag, ...(option.aliases ?? [])]
    .map((flag) => quote(`${context}:${flag}`))
    .join('|');
  return `    ${patterns}) _known=1; _canonical=${quote(option.flag)}; _arity=${option.arity ? 1 : 0}; _kind=${quote(option.kind ?? '')}; _choices=(${words(option.choices ?? [])});;`;
}
function tables(): string {
  const entries = nodes();
  const all = [['', undefined], ...entries] as const;
  const lookup = all.flatMap(([context]) => {
    const options = context ? commandOptions(context.split(' ')[0]) : GLOBAL_OPTIONS;
    return options.map((option) => optionCase(context, option));
  });
  const transition = entries.map(([context]) => {
    const parts = context.split(' '),
      child = parts.pop()!;
    return `    ${quote(`${parts.join(' ')}:${child}`)}) _context=${quote(context)}; _positions=0; return 0;;\n    ${quote(`${parts.length ? 'help ' + parts.join(' ') : 'help'}:${child}`)}) _context=${quote('help ' + context)}; _positions=0; return 0;;`;
  });
  const positional = entries.map(([context, definition]) => {
    const max = definition.children ? 1 : (definition.positional?.max ?? 0);
    return `    ${quote(context)}) _candidates=(${words(choices(definition))}); _kind=${quote(definition.positional?.kind ?? '')}; _max=${max};;`;
  });
  const flags = all.map(([context, definition]) => {
    const options = [...(definition?.options ?? []), ...GLOBAL_OPTIONS];
    const assignments = options
      .filter((option) => !option.hidden)
      .map((option) => {
        const exclude = new Set(option.repeatable ? [] : [option.flag]);
        for (const conflict of definition?.conflicts ?? [])
          if (conflict.includes(option.flag)) for (const flag of conflict) exclude.add(flag);
        if (option.flag === '--json') exclude.add('--human');
        if (option.flag === '--human') exclude.add('--json');
        const condition = [...exclude]
          .map((flag) => `[[ " $_seen " != *${quote(' ' + flag + ' ')}* ]]`)
          .join(' && ');
        const assignment = `_candidates+=(${words([option.flag, ...(option.aliases ?? [])])})`;
        return `      ${condition ? `if ${condition}; then ${assignment}; fi` : assignment}`;
      });
    return `    ${quote(context)})\n${assignments.join('\n')}\n      ;;`;
  });
  return `_anhedral_option() {
  _known=0; _arity=0; _kind=''; _choices=(); _canonical=''
  case "$1:$2" in
${lookup.join('\n')}
  esac
}
_anhedral_transition() {
  case "$_context:$1" in
    ':help') _context='help'; _positions=0; return 0;;
${transition.join('\n')}
  esac
  return 1
}
_anhedral_node() {
  _candidates=(); _kind=''; _max=0
  case "$1" in
    ''|'help') _candidates=(${words([...Object.keys(COMMANDS), 'help'])}); _max=1;;
${positional.join('\n')}
  esac
}
_anhedral_flags() {
  _candidates=(); _kind=''
  case "$1" in
${flags.join('\n')}
  esac
}
_anhedral_prepare() {
  _needle="$1"; shift
  _context=''; _pending=''; _pending_context=''; _seen=''; _positions=0; _end=0
  _prefix=''; _used_values=()
  local word flag
  for word in "$@"; do
    if [[ -n "$_pending" ]]; then
      if [[ "$word" = '=' ]]; then continue; fi
      _pending=''; continue
    fi
    if [[ "$_end" = 0 && "$word" = '--' ]]; then _end=1; continue; fi
    if [[ "$_end" = 0 && "$word" = -* ]]; then
      flag="\${word%%=*}"
      _anhedral_option "$_context" "$flag"
      if [[ "$_known" = 1 ]]; then
        _seen="$_seen $_canonical"
        if [[ "$_arity" = 1 && "$word" != *=* ]]; then
          _pending="$flag"; _pending_context="$_context"
        fi
      fi
      continue
    fi
    if ! _anhedral_transition "$word"; then
      _positions=$((_positions + 1)); _used_values+=("$word")
    fi
  done
  if [[ -n "$_pending" ]]; then
    [[ "$_needle" = '=' ]] && _needle=''
    _anhedral_option "$_pending_context" "$_pending"
    _candidates=("\${_choices[@]}")
    return
  fi
  if [[ "$_end" = 0 && "$_needle" = --*=* ]]; then
    flag="\${_needle%%=*}"
    _anhedral_option "$_context" "$flag"
    if [[ "$_known" = 1 && "$_arity" = 1 ]]; then
      _prefix="$flag="; _needle="\${_needle#*=}"; _candidates=("\${_choices[@]}"); return
    fi
  fi
  if [[ "$_end" = 0 && "$_needle" = -* ]]; then
    _anhedral_flags "$_context"
    if [[ -z "$_context" ]]; then _candidates+=('--version' '-v'); fi
    return
  fi
  local topic="\${_context#help }"
  _anhedral_node "$topic"
  if [[ "$_positions" -ge "$_max" ]]; then _candidates=(); _kind=''; fi
}
`;
}
const locals = `  local _context _pending _pending_context _seen _positions _end _prefix _needle
  local _known _arity _kind _canonical _max candidate used duplicate
  local -a _candidates _choices _used_values`;

/** Generate static completion source; no shell profiles, network or resource discovery. */
export function completionScript(shell: 'bash' | 'zsh'): string {
  const header = `# Anhedral ${shell} completion. Source this file after shell completion initialization.\n`;
  if (shell === 'bash')
    return (
      header +
      tables() +
      `_anhedral() {
${locals}
  COMPREPLY=()
  _anhedral_prepare "\${COMP_WORDS[COMP_CWORD]}" "\${COMP_WORDS[@]:1:COMP_CWORD-1}"
  if [[ "$_kind" = 'file' || "$_kind" = 'directory' ]]; then
    local mode='-f'
    [[ "$_kind" = 'directory' ]] && mode='-d'
    while IFS= read -r candidate; do COMPREPLY+=("$_prefix$candidate"); done < <(compgen "$mode" -- "$_needle")
  else
    for candidate in "\${_candidates[@]}"; do
      duplicate=0
      for used in "\${_used_values[@]}"; do [[ "$used" = "$candidate" ]] && duplicate=1; done
      if [[ "$duplicate" = 0 && "$candidate" = "$_needle"* ]]; then COMPREPLY+=("$_prefix$candidate"); fi
    done
  fi
}
complete -o filenames -F _anhedral anhedral
`
    );
  return (
    header +
    tables() +
    `_anhedral() {
${locals}
  local -a prior
  local i
  for ((i=2; i<CURRENT; i++)); do prior+=("\${words[i]}"); done
  _anhedral_prepare "\${words[CURRENT]}" "\${prior[@]}"
  if [[ "$_kind" = 'file' || "$_kind" = 'directory' ]]; then
    local PREFIX="$_needle"
    if [[ "$_kind" = 'directory' ]]; then _files -/ -P "$_prefix"; else _files -P "$_prefix"; fi
  else
    local -a matches
    for candidate in "\${_candidates[@]}"; do
      duplicate=0
      for used in "\${_used_values[@]}"; do [[ "$used" = "$candidate" ]] && duplicate=1; done
      [[ "$duplicate" = 0 && "$candidate" = "$_needle"* ]] && matches+=("$_prefix$candidate")
    done
    compadd -a matches
  fi
}
compdef _anhedral anhedral
`
  );
}
