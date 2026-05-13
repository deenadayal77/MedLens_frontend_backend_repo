export interface ProductResponse {
  heading: string;
  context: string;
  takeaways: string[];
  insight?: string;
  action?: string;
  details: string[];
  tags: string[];
}

const FILLER_PATTERNS = [
  /^here are (some|the) (key )?(points|takeaways)[:\s-]*/i,
  /^in conclusion[:,\s-]*/i,
  /^it is important to note that\s*/i,
  /^please note that\s*/i,
  /^based on (the|your) (uploaded )?(medical )?report[:,\s-]*/i,
];

const ACTION_TERMS = [
  'ask',
  'call',
  'consult',
  'discuss',
  'follow',
  'go',
  'review',
  'schedule',
  'seek',
  'share',
  'talk',
  'visit',
];

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeFiller(value: string) {
  return FILLER_PATTERNS.reduce((text, pattern) => text.replace(pattern, ''), value).trim();
}

function cleanLine(value: string) {
  return removeFiller(
    stripMarkdown(
      value
        .replace(/^[-•]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/^(answer|what the report says|key takeaways?|optional insight|insight|action|next steps?|next step|heading):\s*/i, ''),
    ),
  );
}

function splitSentences(value: string) {
  return stripMarkdown(value)
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(cleanLine)
    .filter(Boolean);
}

function parseExplicitBullets(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^([-•]|\d+[.)])\s+/.test(line))
    .map(cleanLine)
    .filter(Boolean);
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sentenceLooksActionable(sentence: string) {
  const normalized = sentence.toLowerCase();
  return ACTION_TERMS.some((term) => normalized.includes(`${term} `));
}

function makeHeading(question?: string, fallback?: string) {
  const cleanedQuestion = question ? cleanLine(question) : '';
  if (cleanedQuestion) {
    if (/serious|worried|urgent|emergency/i.test(cleanedQuestion)) return 'Urgency check';
    if (/mean|condition|term|finding/i.test(cleanedQuestion)) return 'Plain-language meaning';
    if (/next|do|step|doctor|follow/i.test(cleanedQuestion)) return 'Next steps';
    return cleanedQuestion.length > 56 ? `${cleanedQuestion.slice(0, 53)}...` : cleanedQuestion;
  }

  const first = fallback ? cleanLine(fallback) : '';
  if (!first) return 'Report answer';
  return first.length > 56 ? `${first.slice(0, 53)}...` : first;
}

export function formatAssistantResponse(content: string, question?: string): ProductResponse {
  const explicitBullets = parseExplicitBullets(content);
  const sentences = splitSentences(content);
  const candidates = uniqueLines(explicitBullets.length > 0 ? explicitBullets : sentences);
  const fallback = 'The report does not provide enough detail to answer that clearly.';
  const takeaways = (candidates.length > 0 ? candidates : [fallback]).slice(0, 5);
  const remaining = sentences.filter((sentence) => !takeaways.includes(sentence));
  const action = remaining.find(sentenceLooksActionable) ?? takeaways.find(sentenceLooksActionable);
  const insight = remaining.find((sentence) => sentence !== action && sentence.length <= 140);
  const details = uniqueLines([...takeaways, ...remaining]).slice(0, 6);

  return {
    heading: makeHeading(question, takeaways[0]),
    context: 'Based on your PDF',
    takeaways: takeaways.slice(0, 5),
    insight,
    action,
    details,
    tags: ['Report context', 'Grounded answer'],
  };
}

export function productResponseToText(response: ProductResponse) {
  const lines = [
    response.heading,
    '',
    'Key takeaways:',
    ...response.takeaways.map((item) => `- ${item}`),
  ];

  if (response.insight) {
    lines.push('', `Insight: ${response.insight}`);
  }

  if (response.action) {
    lines.push('', `Next step: ${response.action}`);
  }

  return lines.join('\n');
}
