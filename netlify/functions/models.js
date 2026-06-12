// Modeles tries par prix croissant — tous verifies sur OpenRouter juin 2026
const MODELS = [
  // --- ULTRA CHEAP ---
  { id: 'google/gemma-3n-e4b-it',                label: 'Gemma 3n 4B (gratuit)',      price_in: 0.0,   price_out: 0.0,   tag: 'free' },
  { id: 'meta-llama/llama-3.2-3b-instruct',      label: 'Llama 3.2 3B (gratuit)',     price_in: 0.0,   price_out: 0.0,   tag: 'free' },
  { id: 'deepseek/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1 Qwen 32B',       price_in: 0.12,  price_out: 0.18,  tag: 'cheap' },
  { id: 'mistralai/mistral-small-3.2',           label: 'Mistral Small 3.2',           price_in: 0.10,  price_out: 0.30,  tag: 'cheap' },
  { id: 'meta-llama/llama-3.3-70b-instruct',     label: 'Llama 3.3 70B',              price_in: 0.12,  price_out: 0.30,  tag: 'cheap' },
  { id: 'qwen/qwen-2.5-72b-instruct',            label: 'Qwen 2.5 72B',               price_in: 0.13,  price_out: 0.40,  tag: 'cheap' },
  { id: 'qwen/qwq-32b',                          label: 'QwQ 32B (reasoning)',         price_in: 0.12,  price_out: 0.18,  tag: 'cheap' },
  { id: 'google/gemini-flash-2.5',               label: 'Gemini Flash 2.5',            price_in: 0.10,  price_out: 0.40,  tag: 'cheap' },
  { id: 'google/gemini-flash-2.5-8b',            label: 'Gemini Flash 2.5 8B',         price_in: 0.04,  price_out: 0.15,  tag: 'cheap' },
  { id: 'openai/gpt-4o-mini',                    label: 'GPT-4o Mini',                 price_in: 0.15,  price_out: 0.60,  tag: 'cheap' },
  { id: 'anthropic/claude-3-haiku',              label: 'Claude 3 Haiku',              price_in: 0.25,  price_out: 1.25,  tag: 'cheap' },
  { id: 'mistralai/codestral-2501',              label: 'Codestral (code)',            price_in: 0.30,  price_out: 0.90,  tag: 'cheap' },
  // --- MID ---
  { id: 'deepseek/deepseek-chat-v3-0324',        label: 'DeepSeek V3',                 price_in: 0.27,  price_out: 1.10,  tag: 'mid' },
  { id: 'deepseek/deepseek-r1',                  label: 'DeepSeek R1 (reasoning)',     price_in: 0.55,  price_out: 2.19,  tag: 'mid' },
  { id: 'mistralai/mistral-medium-3',            label: 'Mistral Medium 3',            price_in: 0.40,  price_out: 2.00,  tag: 'mid' },
  { id: 'google/gemini-pro-2.5',                 label: 'Gemini Pro 2.5',              price_in: 1.25,  price_out: 10.0,  tag: 'mid' },
  { id: 'openai/gpt-4.1-mini',                   label: 'GPT-4.1 Mini',                price_in: 0.40,  price_out: 1.60,  tag: 'mid' },
  { id: 'openai/gpt-4o',                         label: 'GPT-4o',                      price_in: 2.50,  price_out: 10.0,  tag: 'mid' },
  { id: 'openai/o4-mini',                        label: 'o4-mini (reasoning)',          price_in: 1.10,  price_out: 4.40,  tag: 'mid' },
  // --- PREMIUM ---
  { id: 'anthropic/claude-sonnet-4',             label: 'Claude Sonnet 4',             price_in: 3.00,  price_out: 15.0,  tag: 'premium' },
  { id: 'anthropic/claude-opus-4',               label: 'Claude Opus 4',               price_in: 15.0,  price_out: 75.0,  tag: 'premium' },
  { id: 'openai/gpt-4.5',                        label: 'GPT-4.5',                     price_in: 75.0,  price_out: 150.0, tag: 'premium' },
  { id: 'google/gemini-2.5-pro',                 label: 'Gemini 2.5 Pro',              price_in: 2.50,  price_out: 15.0,  tag: 'premium' },
  { id: 'x-ai/grok-3-mini-beta',                 label: 'Grok 3 Mini',                 price_in: 0.30,  price_out: 0.50,  tag: 'mid' },
  { id: 'x-ai/grok-3-beta',                      label: 'Grok 3',                      price_in: 3.00,  price_out: 15.0,  tag: 'premium' }
];

exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(MODELS)
});
