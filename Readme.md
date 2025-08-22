## What is top_p?

It’s a probability cutoff for selecting the next token during generation.

Instead of always picking from all possible tokens, the model only looks at the smallest set of tokens whose cumulative probability is ≥ p.

Example:

Suppose the model predicts the next word with these probabilities:

"cat" → 0.5
"dog" → 0.3
"fish" → 0.15
"banana" → 0.05


If top_p = 0.8, the model will only consider "cat" (0.5) and "dog" (0.3), because together they sum to 0.8. "fish" and "banana" are ignored.

Then it randomly picks between "cat" and "dog".

## Why use top_p?

Controls creativity vs determinism:

Low top_p (e.g., 0.3) → safer, focused, less diverse output.

High top_p (e.g., 0.9–1.0) → more creative, but possibly less relevant.

## Difference from temperature

temperature: smooths the distribution (how "flat" or "sharp" probabilities are).

top_p: trims low-probability tokens completely.

They’re often used together for fine control.