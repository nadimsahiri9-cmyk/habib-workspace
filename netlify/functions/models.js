const MODELS = [
  { id: 'deepseek/deepseek-chat-v3-0324',        label: 'DeepSeek V3',           price_in: 0.27,  price_out: 1.10 },
  { id: 'deepseek/deepseek-r1',                  label: 'DeepSeek R1',           price_in: 0.55,  price_out: 2.19 },
  { id: 'deepseek/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1 Qwen 32B', price_in: 0.12,  price_out: 0.18 },
  { id: 'qwen/qwen-2.5-72b-instruct',            label: 'Qwen 2.5 72B',          price_in: 0.13,  price_out: 0.40 },
  { id: 'qwen/qwq-32b',                          label: 'QwQ 32B (reasoning)',   price_in: 0.12,  price_out: 0.18 },
  { id: 'mistralai/mistral-small-3.2',           label: 'Mistral Small 3.2',     price_in: 0.10,  price_out: 0.30 },
  { id: 'mistralai/mistral-medium-3',            label: 'Mistral Medium 3',      price_in: 0.40,  price_out: 2.00 },
  { id: 'google/gemini-flash-2.5',               label: 'Gemini Flash 2.5',      price_in: 0.10,  price_out: 0.40 },
  { id: 'openai/gpt-4o-mini',                    label: 'GPT-4o Mini',           price_in: 0.15,  price_out: 0.60 },
  { id: 'anthropic/claude-3-haiku',              label: 'Claude 3 Haiku',        price_in: 0.25,  price_out: 1.25 },
  { id: 'meta-llama/llama-3.3-70b-instruct',     label: 'Llama 3.3 70B',         price_in: 0.12,  price_out: 0.30 }
];

exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(MODELS)
});
