def longest_word(sentence):
    if not sentence:
        return []
    
    # Split sentence into words and remove punctuation
    words = sentence.split()

    # Find the highest length
    highest_length = 0
    for word in words:
        if len(word) > highest_length:
            highest_length = len(word)

    # Collect all words with highest length
    longest_words = []
    for word in words:
        if len(word) == highest_length:
            longest_words.append(word)

    return longest_words