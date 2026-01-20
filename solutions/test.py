def LargestNumberInList(numList):
    # If the list is empty, don't attempt to index it.
    # Instead, just return 0.
    if len(numList) == 0:
        return 0

    # Initialise largest number to the first in the list.
    largestNumber = numList[0]

    # Check our initial largest number against every number
    # in the list, starting at index 1 (we already used index 0).
    for numIdx in range(1, len(numList)):
        if numList[numIdx] > largestNumber:
            largestNumber = numList[numIdx]

    return largestNumber