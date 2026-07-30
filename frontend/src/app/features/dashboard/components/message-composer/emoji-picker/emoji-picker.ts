import { ChangeDetectionStrategy, Component, output } from '@angular/core';

interface EmojiOption {
  readonly character: string;
  readonly label: string;
}

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiPicker {
  readonly emojiSelected = output<string>();

  protected readonly emojis: readonly EmojiOption[] = [
    { character: '😀', label: 'Visage souriant' },
    { character: '😂', label: 'Rire aux larmes' },
    { character: '😊', label: 'Sourire chaleureux' },
    { character: '😍', label: 'Visage amoureux' },
    { character: '🤔', label: 'Visage pensif' },
    { character: '😎', label: 'Visage avec lunettes' },
    { character: '😢', label: 'Visage triste' },
    { character: '😮', label: 'Visage surpris' },
    { character: '👍', label: 'Pouce levé' },
    { character: '👏', label: 'Applaudissements' },
    { character: '🙏', label: 'Merci' },
    { character: '💪', label: 'Force' },
    { character: '❤️', label: 'Cœur rouge' },
    { character: '🔥', label: 'Feu' },
    { character: '🎉', label: 'Fête' },
    { character: '✅', label: 'Validation' },
  ];

  protected selectEmoji(emoji: string): void {
    this.emojiSelected.emit(emoji);
  }
}
