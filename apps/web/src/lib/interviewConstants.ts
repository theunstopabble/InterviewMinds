// 🎭 PERSONA CONFIGURATION
export const PERSONA_DETAILS: Record<
  string,
  { name: string; gender: "male" | "female"; description: string }
> = {
  strict: {
    name: "Vikram",
    gender: "male",
    description: "Senior Staff Engineer. Direct, strict, & technical.",
  },
  friendly: {
    name: "Neha",
    gender: "female",
    description: "Engineering Manager. Supportive & encouraging.",
  },
  system: {
    name: "Sam",
    gender: "male",
    description: "System Architect. Focuses on scalability & design.",
  },
};

// ✅ BOILERPLATES FOR LANGUAGES
export const BOILERPLATES: Record<string, string> = {
  javascript: `// InterviewMinds Environment
// Node.js v18.x

function solution() {
  // Write your code here
  console.log("Hello from InterviewMinds!");
}

solution();`,

  python: `# InterviewMinds Environment
# Python 3.x

def solution():
    # Write your code here
    print("Hello from InterviewMinds!")

if __name__ == "__main__":
    solution()`,

  java: `// InterviewMinds Environment
// Java JDK 17

public class Main {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello from InterviewMinds!");
    }
}`,

  cpp: `// InterviewMinds Environment
// GCC C++17

#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello from InterviewMinds!" << endl;
    return 0;
}`,

  c: `// InterviewMinds Environment
// GCC C11

#include <stdio.h>

int main() {
    // Write your code here
    printf("Hello from InterviewMinds!\\n");
    return 0;
}`,
};
