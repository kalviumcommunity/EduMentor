## What Is Temperature?

Temperature is a parameter in large language models (LLMs) that controls the randomness of the model’s output. It influences how likely the model is to pick less probable words during generation, thereby affecting creativity vs. consistency.

Mathematically, temperature scales the logits (raw model outputs) before applying the softmax function, altering the probability distribution of the next token selection.

Low temperatures make the model more deterministic (reliable but repetitive), while high temperatures make it more creative (diverse but possibly less accurate).

## Why Use Temperature?

Temperature lets you fine-tune the trade-off between predictability and creativity depending on your task.

Low Temperature (e.g., 0.1–0.3)
Best for factual tasks, code generation, or consistent style — the model sticks to the most probable words.

Medium Temperature (e.g., 0.5–0.8)
Balanced approach for general conversation, storytelling, and mixed tasks.

High Temperature (e.g., 0.9–1.5)
Encourages diversity, novelty, and unexpected responses — useful for brainstorming, poetry, or creative writing.

## How Temperature Works

When predicting the next token, an LLM assigns probabilities to all possible tokens.
Temperature scales these probabilities:

Compute logits for each possible token.

Divide logits by the temperature.

If T < 1, differences between probabilities get amplified, making high-probability tokens even more likely.

If T > 1, probabilities flatten, giving rare tokens a higher chance.

Apply softmax to get a new probability distribution.

Sample the next token from this adjusted distribution.


## When to Adjust Temperature

Lower it for tasks that require accuracy, repeatability, and minimal hallucination.

Increase it when you want more diverse or imaginative outputs.

Keep it task-specific — one size does not fit all.