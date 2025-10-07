import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Trie } from '@/utils/trie';

interface SearchBoxProps {
  trie: Trie;
  onSelect: (name: string) => void;
}

export const SearchBox = ({ trie, onSelect }: SearchBoxProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      const results = trie.searchWithPrefix(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, trie]);

  const handleSelect = (name: string) => {
    setQuery(name);
    setShowSuggestions(false);
    onSelect(name);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50 focus:border-primary transition-colors"
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 glass-card border border-border/50 rounded-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {suggestions.map((name, index) => (
              <button
                key={index}
                onClick={() => handleSelect(name)}
                className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-b-0"
              >
                <span className="font-medium">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
