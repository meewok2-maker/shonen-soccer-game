import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create a loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading Spirit Stadium...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
        });

        // Load sprite sheets
        this.load.spritesheet('striker-sheet', '/assets/sprite-sheet-striker.png', {
            frameWidth: 100,
            frameHeight: 100
        });
    }

    create() {
        console.log('🎮 Spirit Stadium Championship - Booting up!');

        // Create striker animations from sprite sheet
        // Row 0: Idle (frames 0-4)
        this.anims.create({
            key: 'striker-idle',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });
        // Row 1: Walk (frames 8-15)
        this.anims.create({
            key: 'striker-walk',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 8, end: 15 }),
            frameRate: 10,
            repeat: -1
        });
        // Row 2: Run (frames 16-23)
        this.anims.create({
            key: 'striker-run',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 16, end: 23 }),
            frameRate: 12,
            repeat: -1
        });
        // Row 3: Jump (frames 24-31)
        this.anims.create({
            key: 'striker-jump',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 24, end: 31 }),
            frameRate: 10,
            repeat: 0
        });
        // Row 4: Attack/Spellcast (frames 32-39)
        this.anims.create({
            key: 'striker-attack',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 32, end: 39 }),
            frameRate: 14,
            repeat: 0
        });
        // Row 5: Hurt (frames 40-41)
        this.anims.create({
            key: 'striker-hurt',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 40, end: 41 }),
            frameRate: 8,
            repeat: 0
        });
        // Row 6: Death (frames 48-52)
        this.anims.create({
            key: 'striker-death',
            frames: this.anims.generateFrameNumbers('striker-sheet', { start: 48, end: 52 }),
            frameRate: 8,
            repeat: 0
        });

        this.scene.start('MainMenuScene');
    }
}
