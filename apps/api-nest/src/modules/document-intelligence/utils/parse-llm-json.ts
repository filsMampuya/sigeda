export function parseLlmJsonContent(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const extracted = extractBalancedJsonObject(trimmed);

  if (!extracted) {
    throw new Error("Aucun JSON exploitable n'a ete trouve dans la reponse du modele.");
  }

  return JSON.parse(extracted);
}

function extractBalancedJsonObject(input: string) {
  const firstBraceIndex = input.indexOf("{");

  if (firstBraceIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = firstBraceIndex; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return input.slice(firstBraceIndex, index + 1);
      }
    }
  }

  return null;
}
