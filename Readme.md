## Tokens and Tokenization:
## What Are Tokens?
Tokens are the small units of text that AI and NLP systems operate on—such as words, subwords, characters, or even punctuation—created by splitting raw text so models can process it numerically. In large language models (LLMs), tokenization determines how text is segmented and directly affects input limits, efficiency, and how well models handle rare or novel words.

## What Is Tokenization?
Tokenization is the process of breaking text into tokens according to rules or learned patterns so it can be converted into numerical representations for downstream tasks like classification, translation, and generation. It is a foundational step in the NLP pipeline and precedes embeddings and model inference.

“Tokenization is the task of chopping [text] up into pieces, called tokens, perhaps at the same time throwing away certain characters, such as punctuation.”

## Why Use Tokenization?
Enables models to accept and process text by converting it into structured units that can be embedded as numbers.

Improves robustness to unknown words, typos, and multilingual text when using subword methods.

Reduces vocabulary size while maintaining coverage of rare words by decomposing them into known subpieces.

Provides consistent inputs for tasks like sentiment analysis, text classification, and machine translation.

## Common Tokenization Methods
Word tokenization: Splits on whitespace or punctuation; fewer tokens but struggles with unknown words and languages without spaces.

## Character tokenization: 
Splits into individual characters; robust but creates many tokens, increasing compute.

## Subword tokenization: 
Splits words into frequent chunks to balance vocabulary size and coverage; standard for modern LLMs.

## How Are Tokens Created?
Preprocessing/normalization: Clean or normalize text (lowercasing, Unicode normalization, handling punctuation) depending on tokenizer design.

## Tokenize new text:

Apply pre-tokenization (optional) to split by spaces/punctuation (BPE/WordPiece) or operate on raw byte stream including spaces (SentencePiece).

Greedily match the longest subwords from the vocabulary to segment text into tokens.

Convert tokens to IDs: Map tokens to integer IDs for model input.

## Where Are Tokens Used?
LLM inputs/outputs: All prompts and completions are sequences of token IDs, bounded by model token limits.

Text classification and sentiment analysis: Tokenization feeds models consistent units for feature extraction and embeddings.

Machine translation and summarization: Subword tokenization helps capture morphology and reduces out-of-vocabulary errors.

Information retrieval and search: Tokenization enables indexing and matching at appropriate granularities.