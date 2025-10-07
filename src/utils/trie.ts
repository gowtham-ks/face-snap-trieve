// Trie data structure for fast name-based autocomplete
export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  name: string | null;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.name = null;
  }
}

export class Trie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  // Insert a name into the trie - O(m) where m is length of name
  insert(name: string): void {
    let node = this.root;
    const lowerName = name.toLowerCase();

    for (const char of lowerName) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }

    node.isEndOfWord = true;
    node.name = name; // Store original name with proper casing
  }

  // Search for names with a given prefix - O(p + n) where p is prefix length, n is number of results
  searchWithPrefix(prefix: string): string[] {
    const results: string[] = [];
    const lowerPrefix = prefix.toLowerCase();
    let node = this.root;

    // Navigate to the prefix node
    for (const char of lowerPrefix) {
      if (!node.children.has(char)) {
        return results; // No matches found
      }
      node = node.children.get(char)!;
    }

    // Collect all names starting with this prefix
    this.collectNames(node, results);
    return results;
  }

  // Helper method to collect all names from a node - DFS traversal
  private collectNames(node: TrieNode, results: string[]): void {
    if (node.isEndOfWord && node.name) {
      results.push(node.name);
    }

    for (const child of node.children.values()) {
      this.collectNames(child, results);
    }
  }

  // Check if a name exists in the trie - O(m)
  exists(name: string): boolean {
    let node = this.root;
    const lowerName = name.toLowerCase();

    for (const char of lowerName) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }

    return node.isEndOfWord;
  }

  // Remove a name from the trie
  remove(name: string): boolean {
    const lowerName = name.toLowerCase();
    return this.removeHelper(this.root, lowerName, 0);
  }

  private removeHelper(node: TrieNode, name: string, index: number): boolean {
    if (index === name.length) {
      if (!node.isEndOfWord) {
        return false;
      }
      node.isEndOfWord = false;
      node.name = null;
      return node.children.size === 0;
    }

    const char = name[index];
    const childNode = node.children.get(char);
    
    if (!childNode) {
      return false;
    }

    const shouldDeleteChild = this.removeHelper(childNode, name, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);
      return node.children.size === 0 && !node.isEndOfWord;
    }

    return false;
  }
}
