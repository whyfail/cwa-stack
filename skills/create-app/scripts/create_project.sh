#!/usr/bin/env bash

set -euo pipefail

template=""
preset=""
project_name=""
java_package=""
description=""
parent_dir=""

usage() {
  echo "Usage: $0 (--template <template> | --preset <preset>) --name <project-name> --parent <absolute-dir> [--package <java-package>] [--description <text>]" >&2
  echo "Templates: vite-react | vite-vue3 | next-react-ssr | nuxt-vue3-ssr | spring-boot" >&2
  echo "Presets:   react-spring | vue-spring | next-spring | nuxt-spring" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --template)
      template="${2:-}"
      shift 2
      ;;
    --preset)
      preset="${2:-}"
      shift 2
      ;;
    --name)
      project_name="${2:-}"
      shift 2
      ;;
    --package)
      java_package="${2:-}"
      shift 2
      ;;
    --description)
      description="${2:-}"
      shift 2
      ;;
    --parent)
      parent_dir="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -n "$template" && -n "$preset" ]]; then
  echo "--template and --preset are mutually exclusive." >&2
  usage
  exit 2
fi

if [[ -z "$template" && -z "$preset" ]]; then
  echo "Either --template or --preset is required." >&2
  usage
  exit 2
fi

is_fullstack=0
is_spring=0

case "$template" in
  vite-react|vite-vue3|next-react-ssr|nuxt-vue3-ssr)
    ;;
  spring-boot)
    is_spring=1
    ;;
  "")
    ;;
  *)
    echo "Unsupported template: $template" >&2
    exit 2
    ;;
esac

case "$preset" in
  react-spring|vue-spring|next-spring|nuxt-spring)
    is_fullstack=1
    ;;
  "")
    ;;
  *)
    echo "Unsupported preset: $preset" >&2
    exit 2
    ;;
esac

if [[ ! "$project_name" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "Project name must be lowercase and contain only letters, numbers, dots, underscores, or hyphens." >&2
  exit 2
fi

if (( is_spring )) || (( is_fullstack )); then
  if [[ ! "$java_package" =~ ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$ ]]; then
    echo "This mode requires --package with a valid Java package, e.g. com.mycompany.myapp." >&2
    exit 2
  fi
fi

if [[ "$parent_dir" != /* ]] || [[ ! -d "$parent_dir" ]]; then
  echo "Parent must be an existing absolute directory: $parent_dir" >&2
  exit 2
fi

destination="$parent_dir/$project_name"
if [[ -e "$destination" ]]; then
  echo "Destination already exists: $destination" >&2
  exit 1
fi

for command_name in node npm npx git pnpm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if (( node_major < 20 )); then
  echo "Node.js 20 or newer is required; found $(node --version)." >&2
  exit 1
fi

if (( is_fullstack )); then
  input="$(printf '%s\n%s\n%s\n%s\n' "preset:$preset" "$project_name" "$java_package" "$description")"
elif (( is_spring )); then
  input="$(printf '%s\n%s\n%s\n%s\n' "$template" "$project_name" "$java_package" "$description")"
else
  input="$(printf '%s\n%s\n%s\n' "$template" "$project_name" "$description")"
fi

(
  cd "$parent_dir"
  printf '%s' "$input" | npx --yes cwa-stack@latest create
)

if (( is_fullstack )); then
  if [[ ! -f "$destination/cwa.config.json" ]]; then
    echo "Generator finished without creating a valid full-stack project at: $destination" >&2
    exit 1
  fi
elif (( is_spring )); then
  if [[ ! -d "$destination/src/main/java" ]]; then
    echo "Generator finished without creating a valid backend project at: $destination" >&2
    exit 1
  fi
else
  if [[ ! -f "$destination/package.json" ]]; then
    echo "Generator finished without creating a valid project at: $destination" >&2
    exit 1
  fi
fi

echo "Created project: $destination"
