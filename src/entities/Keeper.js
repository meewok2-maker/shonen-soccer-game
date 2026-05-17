import Phaser from 'phaser';

export default class Keeper {
    constructor(scene, x, y, isRemote = false) {
        this.scene = scene;
        this.isRemote = isRemote;

        // Create a container to hold all visual elements
        this.container = scene.add.container(x, y);

        // Create unique texture key for this instance
        const textureKey = `keeper-${Date.now()}-${Math.random()}`;

        // Only generate texture if it doesn't exist
        if (!scene.textures.exists(textureKey)) {
            const graphics = scene.add.graphics();
            this.drawCharacter(graphics);
            graphics.generateTexture(textureKey, 50, 70);
            graphics.destroy();
        }

        // Create sprite from the generated texture
        this.sprite = scene.add.sprite(0, 0, textureKey);
        this.container.add(this.sprite);

        // Physics body on the container
        scene.physics.add.existing(this.container);
        this.container.body.setCollideWorldBounds(true);
        this.container.body.setSize(40, 60);
        this.container.body.setOffset(-20, -35);

        // Set depth to be visible
        this.container.setDepth(75);

        // Movement properties
        this.speed = 220;

        // Defense properties
        this.isBlocking = false;
        this.canBlock = true;
        this.blockDuration = 500; // milliseconds
        this.blockCooldown = 1000;

        // Input setup (Arrow Keys + Shift) - only for local player
        if (!isRemote) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.blockKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
            console.log('🛡️ Keeper input initialized:', this.cursors, this.blockKey);
        }

        // Magic aura effect (different from Striker)
        this.aura = scene.add.circle(0, 0, 35, 0x9c27b0, 0.2);
        this.container.add(this.aura);
        scene.tweens.add({
            targets: this.aura,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.1,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Shield (appears when blocking)
        this.shield = scene.add.circle(0, -10, 45, 0x00bcd4, 0);
        this.shield.setStrokeStyle(4, 0xffffff, 0.8);
        this.container.add(this.shield);

        // Health system
        this.health = 100;
        this.maxHealth = 100;
        this.isInvincible = false;

        // Health bar (above label)
        this.healthBarBg = scene.add.graphics();
        this.healthBarBg.fillStyle(0x330000, 0.8);
        this.healthBarBg.fillRect(-20, -65, 40, 5);
        this.container.add(this.healthBarBg);

        this.healthBarFg = scene.add.graphics();
        this.healthBarFg.fillStyle(0x00ff00, 1);
        this.healthBarFg.fillRect(-20, -65, 40, 5);
        this.container.add(this.healthBarFg);

        // Label
        this.label = scene.add.text(0, -50, isRemote ? 'KEEPER P2' : 'KEEPER P1', {
            font: 'bold 14px Arial',
            fill: '#9c27b0',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.label.setOrigin(0.5);
        this.container.add(this.label);
    }

    drawCharacter(graphics) {
        // Head (skin tone)
        graphics.fillStyle(0xffdbac, 1);
        graphics.fillCircle(25, 15, 15);

        // Body (purple/magical keeper colors)
        graphics.fillStyle(0x9c27b0, 1);
        graphics.fillRect(10, 30, 30, 35);

        // Legs (shorts)
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(13, 65, 10, 5);
        graphics.fillRect(27, 65, 10, 5);

        // Hair (anime style - long flowing)
        graphics.fillStyle(0xe91e63, 1);
        graphics.fillCircle(17, 10, 10);
        graphics.fillCircle(33, 10, 10);
        graphics.fillCircle(25, 7, 10);
        graphics.fillRect(13, 15, 24, 10);

        // Eyes (magical looking)
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(20, 15, 3);
        graphics.fillCircle(30, 15, 3);
        graphics.fillStyle(0x00bcd4, 1); // Glowing cyan eyes
        graphics.fillCircle(20, 15, 2);
        graphics.fillCircle(30, 15, 2);
    }

    update() {
        // Only handle input for local player
        if (!this.isRemote) {
            if (!this.cursors) {
                console.error('Keeper cursors not initialized!');
                return;
            }

            // Movement
            let velocityX = 0;
            let velocityY = 0;

            if (this.cursors.left.isDown) {
                velocityX = -this.speed;
            } else if (this.cursors.right.isDown) {
                velocityX = this.speed;
            }

            if (this.cursors.up.isDown) {
                velocityY = -this.speed;
            } else if (this.cursors.down.isDown) {
                velocityY = this.speed;
            }

            // Debug: log if movement is detected
            if (velocityX !== 0 || velocityY !== 0) {
                console.log('Keeper moving:', velocityX, velocityY);
            }

            this.container.body.setVelocity(velocityX, velocityY);

            // Blocking
            if (this.blockKey && this.blockKey.isDown && this.canBlock && !this.isBlocking) {
                this.startBlock();
            }

            // Emit position to server for multiplayer sync
            if (this.scene.socket) {
                this.scene.socket.emit('playerMovement', {
                    x: this.container.x,
                    y: this.container.y,
                    playerType: 'keeper'
                });
            }
        }
    }

    // Update position from network (for remote players)
    setPosition(x, y) {
        this.container.x = x;
        this.container.y = y;
    }

    startBlock() {
        this.isBlocking = true;
        this.canBlock = false;

        // Show shield
        this.scene.tweens.add({
            targets: this.shield,
            alpha: 0.8,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 100,
            yoyo: false
        });

        // Slow movement while blocking
        this.speed = 100;

        // Emit block event for multiplayer sync
        if (this.scene.socket && !this.isRemote) {
            this.scene.socket.emit('playerBlock', { blocking: true });
        }

        // End block after duration
        this.scene.time.delayedCall(this.blockDuration, () => {
            this.endBlock();
        });
    }

    endBlock() {
        this.isBlocking = false;

        // Hide shield
        this.scene.tweens.add({
            targets: this.shield,
            alpha: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 200
        });

        // Restore movement speed
        this.speed = 220;

        // Emit block end for multiplayer sync
        if (this.scene.socket && !this.isRemote) {
            this.scene.socket.emit('playerBlock', { blocking: false });
        }

        // Start cooldown
        this.scene.time.delayedCall(this.blockCooldown, () => {
            this.canBlock = true;
        });
    }

    // Trigger block visuals from remote event
    startBlockRemote() {
        this.isBlocking = true;
        this.scene.tweens.add({
            targets: this.shield,
            alpha: 0.8, scaleX: 1.5, scaleY: 1.5,
            duration: 100
        });
    }

    endBlockRemote() {
        this.isBlocking = false;
        this.scene.tweens.add({
            targets: this.shield,
            alpha: 0, scaleX: 1, scaleY: 1,
            duration: 200
        });
    }

    takeDamage(amount) {
        if (this.isInvincible || this.isBlocking) return false;

        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();

        // Flash effect
        this.isInvincible = true;
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                if (this.sprite && this.sprite.active) this.sprite.setAlpha(1);
            }
        });

        // End invincibility after 1 second
        this.scene.time.delayedCall(1000, () => {
            this.isInvincible = false;
        });

        return this.health <= 0;
    }

    setHealth(value) {
        this.health = Math.max(0, value);
        this.updateHealthBar();
    }

    updateHealthBar() {
        this.healthBarFg.clear();
        const ratio = this.health / this.maxHealth;
        let color = 0x00ff00;
        if (ratio < 0.3) color = 0xff0000;
        else if (ratio < 0.6) color = 0xffaa00;
        this.healthBarFg.fillStyle(color, 1);
        this.healthBarFg.fillRect(-20, -65, 40 * ratio, 5);
    }

    playDeathAnimation(onComplete) {
        // Fade out as death animation (no sprite sheet for keeper yet)
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 800,
            onComplete: () => {
                this.container.setAlpha(1);
                if (onComplete) onComplete();
            }
        });
    }

    respawn(x, y) {
        this.health = this.maxHealth;
        this.updateHealthBar();
        this.container.x = x;
        this.container.y = y;
        this.isInvincible = false;
        this.sprite.setAlpha(1);
    }

    destroy() {
        this.container.destroy();
    }
}
