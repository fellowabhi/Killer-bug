"""
Simple Python script for practicing step debugging.
This script includes various debugging scenarios:
- Variables and data types
- Functions and return values
- Loops and conditionals
- List operations
- Exception handling
"""

import random


def calculate_average(numbers):
    """Calculate the average of a list of numbers."""
    total = sum(numbers)
    count = len(numbers)
    average = total / count
    return average


def find_max_value(data):
    """Find the maximum value in a list."""
    max_val = data[0]
    for i in range(1, len(data) - 1):  # BUG
        if data[i] > max_val:
            max_val = data[i]
    return max_val


def process_user_data(users):
    """Process a list of user dictionaries."""
    results = []
    for user in users:
        full_name = f"{user['first_name']} {user['last_name']}"
        age = user['age']
        if age >= 18:
            status = "Adult"
        else:
            status = "Minor"
        results.append({
            'name': full_name,
            'age': age,
            'status': status
        })
    return results


def fibonacci(n):
    """Generate fibonacci sequence up to n terms."""
    sequence = []
    a, b = 0, 1
    for i in range(n):
        sequence.append(a)
        a, b = b, a + b
    return sequence


def main():
    """Main function to demonstrate various debugging scenarios."""
    
    # Scenario 1: Basic arithmetic and variables
    print("=== Scenario 1: Basic Variables ===")
    x = random.randint(1, 100)
    y = random.randint(1, 100)
    z = x + y
    print(f"x={x}, y={y}, z={z}")
    
    # Scenario 2: List operations and function calls
    print("\n=== Scenario 2: List Operations ===")
    numbers = [5, 12, 8, 23, 15, 7]
    avg = calculate_average(numbers)
    max_num = find_max_value(numbers)
    print(f"Numbers: {numbers}")
    print(f"Average: {avg}")
    print(f"Maximum: {max_num}")
    
    # Scenario 3: Dictionary operations
    print("\n=== Scenario 3: Dictionary Processing ===")
    users = [
        {'first_name': 'Alice', 'last_name': 'Smith', 'age': 25},
        {'first_name': 'Bob', 'last_name': 'Jones', 'age': 17},
        {'first_name': 'Charlie', 'last_name': 'Brown', 'age': 30}
    ]
    processed = process_user_data(users)
    for user in processed:
        print(f"{user['name']}: {user['age']} years old ({user['status']})")
    
    # Scenario 4: Loops and sequences
    print("\n=== Scenario 4: Fibonacci Sequence ===")
    fib_count = 8
    fib_sequence = fibonacci(fib_count)
    print(f"First {fib_count} Fibonacci numbers: {fib_sequence}")
    
    # Scenario 5: Conditional logic
    print("\n=== Scenario 5: Conditional Logic ===")
    scores = [85, 92, 78, 95, 88]
    for i, score in enumerate(scores):
        if score >= 90:
            grade = 'A'
        elif score >= 80:
            grade = 'B'
        elif score >= 70:
            grade = 'C'
        else:
            grade = 'F'
        print(f"Student {i+1}: Score={score}, Grade={grade}")
    
    # Scenario 6: Try to cause an error (commented out for safety)
    # Uncomment to practice debugging exceptions
    # print("\n=== Scenario 6: Exception Handling ===")
    # empty_list = []
    # result = calculate_average(empty_list)  # This will cause ZeroDivisionError
    
    print("\n=== All scenarios completed! ===")


if __name__ == "__main__":
    main()
