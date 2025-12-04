#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

#define MAX_WORDS 100000
#define MAX_WORD_LENGTH 30
#define MAX_JUMBLE_LENGTH 20

// Scrabble letter scores
int letter_scores[26] = {
    1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 5, 1, 3, 1, 1, 3, 10, 1, 1, 1, 1, 4, 4, 8, 4, 10
};

// Letter distribution for English (approximate)
char letter_dist[] = "AAAAAAAAABBCCDDDDEEEEEEEEEFFGGHHIIIIIJJKKLLLLMMNNNNNNOOOOOOPPQQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ";

// Function to calculate scrabble score of a word
int calculate_score(const char* word) {
    int score = 0;
    for (int i = 0; word[i] != '\0'; i++) {
        if (isalpha(word[i])) {
            char c = tolower(word[i]);
            score += letter_scores[c - 'a'];
        }
    }
    return score;
}

// Function to check if a word can be formed from the jumble
int can_form_word(const char* word, const char* jumble) {
    int jumble_count[26] = {0};
    int word_count[26] = {0};
    
    // Count letters in jumble
    for (int i = 0; jumble[i] != '\0'; i++) {
        if (isalpha(jumble[i])) {
            char c = tolower(jumble[i]);
            jumble_count[c - 'a']++;
        }
    }
    
    // Count letters in word
    for (int i = 0; word[i] != '\0'; i++) {
        if (isalpha(word[i])) {
            char c = tolower(word[i]);
            word_count[c - 'a']++;
        }
    }
    
    // Check if jumble has enough letters
    for (int i = 0; i < 26; i++) {
        if (word_count[i] > jumble_count[i]) {
            return 0;
        }
    }
    return 1;
}

// Function to generate a random jumble with accurate distribution
void generate_jumble(char* jumble, int length) {
    srand(time(NULL));
    for (int i = 0; i < length; i++) {
        int index = rand() % (int)strlen(letter_dist);
        jumble[i] = letter_dist[index];
    }
    jumble[length] = '\0';
}

// Function to compare words by score (for sorting)
int compare_by_score(const void* a, const void* b) {
    const char** word_a = (const char**)a;
    const char** word_b = (const char**)b;
    int score_a = calculate_score(*word_a);
    int score_b = calculate_score(*word_b);
    return score_b - score_a; // Note: reversed for descending order
}

int main(int argc, char* argv[]) {
    // Read words from dictionary file
    FILE* dict_file;
    char* dict_paths[] = {"/usr/share/dict/words", "/usr/dict/words"};
    char* dict_path = NULL;
    
    for (int i = 0; i < 2; i++) {
        dict_file = fopen(dict_paths[i], "r");
        if (dict_file != NULL) {
            dict_path = dict_paths[i];
            break;
        }
    }
    
    if (dict_file == NULL) {
        printf("Error: Could not open dictionary file.\n");
        return 1;
    }
    
    // Read all words into an array
    char words[MAX_WORDS][MAX_WORD_LENGTH];
    int word_count = 0;
    
    char buffer[MAX_WORD_LENGTH];
    while (fgets(buffer, MAX_WORD_LENGTH, dict_file) != NULL && word_count < MAX_WORDS) {
        buffer[strcspn(buffer, "\n")] = 0; // Remove newline
        if (strlen(buffer) >= 4) { // Only include words with 4 or more letters
            strcpy(words[word_count], buffer);
            word_count++;
        }
    }
    
    fclose(dict_file);
    
    // Generate jumble
    char jumble[MAX_JUMBLE_LENGTH + 1];
    if (argc > 1) {
        strncpy(jumble, argv[1], MAX_JUMBLE_LENGTH);
        jumble[MAX_JUMBLE_LENGTH] = '\0';
    } else {
        generate_jumble(jumble, 6); // Generate a 6-letter jumble
    }
    
    printf("Jumble: %s\n", jumble);
    
    // Find valid words
    char valid_words[21][MAX_WORD_LENGTH];
    int valid_count = 0;
    
    for (int i = 0; i < word_count && valid_count < 21; i++) {
        if (can_form_word(words[i], jumble)) {
            strcpy(valid_words[valid_count], words[i]);
            valid_count++;
        }
    }
    
    // Sort words by score
    qsort(valid_words, valid_count, sizeof(char[MAX_WORD_LENGTH]), compare_by_score);
    
    printf("\nBest words (highest scoring at bottom):\n");
    for (int i = 0; i < valid_count; i++) {
        int score = calculate_score(valid_words[i]);
        printf("%s (score: %d)\n", valid_words[i], score);
    }
    
    return 0;
}