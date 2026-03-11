import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface VirtualKeypadProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  maxLength?: number;
  currentLength?: number;
}

export const VirtualKeypad = ({ onKeyPress, onBackspace, maxLength, currentLength = 0 }: VirtualKeypadProps) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

  const handlePress = (key: string) => {
    if (key === 'backspace') {
      onBackspace();
    } else if (key !== '') {
      if (maxLength && currentLength >= maxLength) return;
      onKeyPress(key);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-[300px] mx-auto">
      {keys.map((key, index) => {
        if (key === '') return <div key={`empty-${index}`} />;
        
        const isBackspace = key === 'backspace';
        
        return (
          <Button
            key={key}
            variant={isBackspace ? "destructive" : "outline"}
            className={`h-16 text-2xl font-semibold rounded-2xl ${
              isBackspace ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'hover:bg-primary/5 border-primary/20'
            }`}
            onClick={() => handlePress(key)}
          >
            {isBackspace ? <Delete className="h-6 w-6" /> : key}
          </Button>
        );
      })}
    </div>
  );
};
