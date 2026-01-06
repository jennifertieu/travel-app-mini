import { aiTools } from "../tools/aiTools";

export const exampleAIFUnction = async () => {
  const completion = await openai.responses.create({
    model: "any model we want", // not all models allow tooling so make sure we use one that allows. Cheapest options are the 'mini' models. they have good enough reasoning and are dirt cheap.
    tools: aiTools,
    input: "Prompt you want",
  });

  const functionCall = completion.output.find(
    (item) => item.type === "function_call"
  );

  let answer;

  if (functionCall) {
    const args = JSON.parse(functionCall.arguments);

    switch (functionCall.name) {
      case "example_tool":
        answer = await toolFunctionExample({ prop: args.anyPropYouWant }); //make sure it matches the prop name you made in your tool

        // inside exampleFunction() you can have it return something like: return `Here is the weather data I gathered: ${weatherData}`;... this is ideal because we can create our own polished response and not have to use ai tokens at all for this. The only ai token we use is prompting the ai and it deciding what tool to call.
        break;
      case "another_tool":
        answer = "I used this other tool";
        break;
    }
  } else {
    // this is a fallback in case there is no tool for the ai to be able to use
    answer = completion.output_text;
  }
};
