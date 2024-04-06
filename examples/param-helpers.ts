import OpenAI from 'openai';

const openai = new OpenAI();

export async function test() {
  const rawParams = {
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: 'world',
      },
    ],
  };

  const params = openai.params.ChatCompletionCreateParamsBaseCreator({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: 'world',
      },
    ],
  });

  // @ts-expect-error unwrapped params don't narrow
  await openai.chat.completions.create(rawParams);

  // no error
  await openai.chat.completions.create(params);
}
