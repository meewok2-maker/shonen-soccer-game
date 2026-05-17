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

        // Load sprite atlas (variable frame sizes)
        this.load.atlas('striker-sheet', '/assets/sprite-sheet-striker.png', '/assets/striker-atlas.json');
    }

    create() {
        console.log('🎮 Spirit Stadium Championship - Booting up!');

        // Create striker animations from atlas frames
        this.anims.create({
            key: 'striker-idle',
            frames: [
                { key: 'striker-sheet', frame: 'idle_0' },
                { key: 'striker-sheet', frame: 'idle_1' },
                { key: 'striker-sheet', frame: 'idle_2' },
                { key: 'striker-sheet', frame: 'idle_3' },
            ],
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'striker-walk',
            frames: [
                { key: 'striker-sheet', frame: 'walk_0' },
                { key: 'striker-sheet', frame: 'walk_1' },
                { key: 'striker-sheet', frame: 'walk_2' },
                { key: 'striker-sheet', frame: 'walk_3' },
                { key: 'striker-sheet', frame: 'walk_4' },
                { key: 'striker-sheet', frame: 'walk_5' },
                { key: 'striker-sheet', frame: 'walk_6' },
                { key: 'striker-sheet', frame: 'walk_7' },
            ],
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'striker-run',
            frames: [
                { key: 'striker-sheet', frame: 'run_0' },
                { key: 'striker-sheet', frame: 'run_1' },
                { key: 'striker-sheet', frame: 'run_2' },
                { key: 'striker-sheet', frame: 'run_3' },
                { key: 'striker-sheet', frame: 'run_4' },
                { key: 'striker-sheet', frame: 'run_5' },
            ],
            frameRate: 12,
            repeat: -1
        });
        this.anims.create({
            key: 'striker-attack',
            frames: [
                { key: 'striker-sheet', frame: 'attack_0' },
                { key: 'striker-sheet', frame: 'attack_1' },
                { key: 'striker-sheet', frame: 'attack_2' },
                { key: 'striker-sheet', frame: 'attack_3' },
            ],
            frameRate: 14,
            repeat: 0
        });
        this.anims.create({
            key: 'striker-hurt',
            frames: [
                { key: 'striker-sheet', frame: 'hurt_0' },
                { key: 'striker-sheet', frame: 'hurt_1' },
                { key: 'striker-sheet', frame: 'hurt_2' },
                { key: 'striker-sheet', frame: 'hurt_3' },
            ],
            frameRate: 8,
            repeat: 0
        });
        this.anims.create({
            key: 'striker-death',
            frames: [
                { key: 'striker-sheet', frame: 'death_0' },
                { key: 'striker-sheet', frame: 'death_1' },
                { key: 'striker-sheet', frame: 'death_2' },
                { key: 'striker-sheet', frame: 'death_3' },
                { key: 'striker-sheet', frame: 'death_4' },
                { key: 'striker-sheet', frame: 'death_5' },
                { key: 'striker-sheet', frame: 'death_6' },
            ],
            frameRate: 8,
            repeat: 0
        });

        this.scene.start('MainMenuScene');
    }
}
