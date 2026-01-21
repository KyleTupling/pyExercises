def MostCommonNumber(numList):
    # If an empty list was passed in, we can
    # return None instantly
    if not numList:
        return None
    
    # Populate dictionary of num : counts
    # Once populated, would look like:
    # {
    #     1: 2,
    #     3: 1,
    #     5: 1,
    #     2: 1
    # }
    # For numList = [1, 3, 1, 5, 2]
    counts = {}
    for num in numList:
        counts[num] = counts.get(num, 0) + 1

    # Get the highest count (RHS of dictionary entry)
    highest_count = max(counts.values())
    # If the highest count is 1 or less, and the given
    # number list has more than one element, we can
    # return None.
    if highest_count <= 1 and len(numList) > 1:
            return None
    
    # Collect most common number(s)
    # Some numbers may appear the same amount of times
    most_common = []
    for num, count in counts.items():
        if count == highest_count:
            most_common.append(num)
    
    return most_common