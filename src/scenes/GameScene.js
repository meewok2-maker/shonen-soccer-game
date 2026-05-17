import Phaser from 'phaser';
import Striker from '../entities/Striker.js';
import Keeper from '../entities/Keeper.js';
import Enemy from '../entities/Enemy.js';
import { calculateWaveEnemies, calculateSpawnInterval, selectEnemyType, calculateWaveBonus, calculateBlockScore } from '../utils/waveCalculator.js';
import io from 'socket.io-client';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.currentNight = data.night || 1;
        this.remotePlayers = {};
        this.myRole = null;
        this.myPlayer = null;
        this.playersConnected = 0;
        this.gameStarted = false;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Connect to multiplayer server (this will assign our role)
        this.setupMultiplayer();

        // Create starfield background
        this.createStarfield();

        // Draw the playing field
        this.createField();

        // Create the Sacred Shrine (goal)
        this.createShrine();

        // Create UI
        this.createUI();

        // Game state
        this.shrineHealth = 100;
        this.score = 0;
        this.harmonyMeter = 0;

        // Enemies group (regular group - NOT physics group, to avoid resetting enemy body config)
        this.enemies = this.add.group();
        this.enemyList = []; // Track individual enemy instances

        // Wave system
        this.currentWave = 0;
        this.waveInProgress = false;
        this.waveTimer = null;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;

        // Debug indicator
        this.debugText = this.add.text(width / 2, height / 2, 'Waiting for players...', {
            font: 'bold 24px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.debugText.setOrigin(0.5);

        console.log(`🌙 Night ${this.currentNight} begins!`);
    }

    setupMultiplayer() {
        // Connect to Socket.IO server
        const isDev = window.location.port === '5555';
        this.socket = isDev ? io('http://localhost:3000') : io();

        this.socket.on('connect', () => {
            console.log('🌐 Connected to multiplayer server!');
        });

        // Handle server full (max 2 players)
        this.socket.on('serverFull', (data) => {
            if (this.debugText) {
                this.debugText.setText('GAME IS FULL\nOnly 2 players allowed.');
                this.debugText.setFill('#ff0000');
            }
        });

        // Handle current players (when joining)
        this.socket.on('currentPlayers', (data) => {
            console.log('📥 Received player data:', data);

            try {
                // Validate data structure
                if (!data || !data.players || !data.yourId || !data.yourRole) {
                    throw new Error('Invalid player data received from server');
                }

                // Clean up existing players before recreating (prevents duplicates on reconnect)
                if (this.myPlayer) {
                    this.myPlayer.destroy();
                    this.myPlayer = null;
                }
                Object.keys(this.remotePlayers).forEach(id => {
                    if (this.remotePlayers[id] && this.remotePlayers[id].player) {
                        this.remotePlayers[id].player.destroy();
                    }
                });
                this.remotePlayers = {};

                // Create our local player based on assigned role
                this.myRole = data.yourRole;
                const myInfo = data.players[data.yourId];

                if (!myInfo) {
                    throw new Error(`Player info not found for ID: ${data.yourId}`);
                }

                console.log(`Creating ${this.myRole} at position (${myInfo.x}, ${myInfo.y})`);

                if (this.myRole === 'striker') {
                    this.myPlayer = new Striker(this, myInfo.x, myInfo.y, false);
                    console.log('⚽ You are the STRIKER! Player created:', this.myPlayer);
                } else if (this.myRole === 'keeper') {
                    this.myPlayer = new Keeper(this, myInfo.x, myInfo.y, false);
                    console.log('🛡️ You are the KEEPER! Player created:', this.myPlayer);
                } else {
                    throw new Error(`Unknown role: ${this.myRole}`);
                }

                if (this.myPlayer && this.myPlayer.container) {
                    console.log('✅ Player container exists at:', this.myPlayer.container.x, this.myPlayer.container.y);

                    // Count players
                    this.playersConnected = Object.keys(data.players).length;
                    console.log(`Players connected: ${this.playersConnected}/2`);

                    // Remove debug text once player is created
                    if (this.debugText) {
                        if (this.playersConnected >= 2) {
                            this.debugText.setText('BOTH PLAYERS READY!');
                            this.time.delayedCall(2000, () => {
                                if (this.debugText) {
                                    this.debugText.destroy();
                                }
                                this.checkStartGame();
                            });
                        } else {
                            this.debugText.setText(`Waiting for ${this.myRole === 'striker' ? 'Keeper' : 'Striker'}...`);
                        }
                    }
                }

                // Create remote players for all other connected players
                if (data.players) {
                    Object.keys(data.players).forEach((id) => {
                        if (id !== data.yourId && data.players[id]) {
                            this.addRemotePlayer(data.players[id]);
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Error creating player:', error);
                console.error('Full error stack:', error.stack);
                if (this.debugText) {
                    this.debugText.setText(`ERROR: ${error.message}`);
                    this.debugText.setFill('#ff0000');
                }
            }
        });

        // Handle new player joining
        this.socket.on('newPlayer', (playerInfo) => {
            this.addRemotePlayer(playerInfo);
            this.playersConnected++;
            console.log(`New player joined! Total: ${this.playersConnected}/2`);

            // Update debug text and check if we can start
            if (this.debugText && this.playersConnected >= 2) {
                this.debugText.setText('BOTH PLAYERS READY!');
                this.time.delayedCall(2000, () => {
                    if (this.debugText) {
                        this.debugText.destroy();
                    }
                    this.checkStartGame();
                });
            }
        });

        // Handle player movement
        this.socket.on('playerMoved', (playerData) => {
            if (this.remotePlayers[playerData.id]) {
                const remotePlayer = this.remotePlayers[playerData.id];
                if (remotePlayer.player) {
                    remotePlayer.player.setPosition(playerData.x, playerData.y);
                }
            }
        });

        // Handle remote player shooting (show ball on our screen)
        this.socket.on('remotePlayerShoot', (shootData) => {
            const remote = this.remotePlayers[shootData.id];
            if (remote && remote.player && remote.player.shootRemote) {
                remote.player.shootRemote(shootData.x, shootData.y);
            }
        });

        // Handle remote player blocking (show shield on our screen)
        this.socket.on('remotePlayerBlock', (blockData) => {
            const remote = this.remotePlayers[blockData.id];
            if (remote && remote.player) {
                if (blockData.blocking) {
                    remote.player.startBlockRemote();
                } else {
                    remote.player.endBlockRemote();
                }
            }
        });

        // Handle remote enemy spawn (keeper receives from striker host)
        this.socket.on('remoteSpawnEnemy', (enemyData) => {
            this.spawnEnemyAt(enemyData.x, enemyData.y, enemyData.type, enemyData.enemyId);
        });

        // Handle remote enemy killed
        this.socket.on('remoteEnemyKilled', (killData) => {
            const enemy = this.enemyList.find(e => e.syncId === killData.enemyId);
            if (enemy) {
                enemy.takeDamage(999); // Force kill
                this.enemyList = this.enemyList.filter(e => e !== enemy);
                this.enemiesKilled++;
            }
        });

        // Handle remote shrine damage
        this.socket.on('remoteShrineDamaged', (damageData) => {
            this.shrineHealth = Math.max(0, this.shrineHealth - damageData.amount);
            this.shrineHealthText.setText(`SHRINE: ${this.shrineHealth}%`);
            this.cameras.main.shake(200, 0.01);
            if (this.shrineHealth <= 0) {
                this.gameOver();
            }
        });

        // Handle remote score update
        this.socket.on('remoteScoreUpdate', (scoreData) => {
            this.score = scoreData.score;
            this.scoreText.setText(`SCORE: ${this.score}`);
            this.updateHarmonyMeter(scoreData.harmony);
        });

        // Handle remote wave sync
        this.socket.on('remoteWaveSync', (waveData) => {
            if (waveData.action === 'start') {
                this.currentWave = waveData.wave;
                this.waveInProgress = true;
                this.enemiesSpawned = 0;
                this.enemiesKilled = 0;
                // Show wave announcement
                const waveText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2,
                    `WAVE ${this.currentWave}`,
                    { font: 'bold 48px Arial', fill: '#ff0000', stroke: '#000000', strokeThickness: 6 }
                );
                waveText.setOrigin(0.5);
                this.tweens.add({
                    targets: waveText, scaleX: 1.5, scaleY: 1.5, alpha: 0,
                    duration: 2000, onComplete: () => waveText.destroy()
                });
            } else if (waveData.action === 'complete') {
                this.waveInProgress = false;
                const bonus = waveData.bonus;
                const completeText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2,
                    `WAVE ${this.currentWave} COMPLETE!\n+${bonus} BONUS`,
                    { font: 'bold 36px Arial', fill: '#00ff00', stroke: '#000000', strokeThickness: 5, align: 'center' }
                );
                completeText.setOrigin(0.5);
                this.tweens.add({
                    targets: completeText, alpha: 0, y: completeText.y - 50,
                    duration: 3000, onComplete: () => completeText.destroy()
                });
            }
        });

        // Handle remote player damage (update their health bar)
        this.socket.on('remotePlayerDamaged', (data) => {
            const remote = this.remotePlayers[data.id];
            if (remote && remote.player && remote.player.setHealth) {
                remote.player.setHealth(data.health);
            }
        });

        // Handle player disconnect
        this.socket.on('playerDisconnected', (playerId) => {
            if (this.remotePlayers[playerId]) {
                this.remotePlayers[playerId].player.destroy();
                delete this.remotePlayers[playerId];
                this.playersConnected = Math.max(1, this.playersConnected - 1);
                console.log(`Player ${playerId} disconnected. Players: ${this.playersConnected}/2`);
            }
        });
    }

    addRemotePlayer(playerInfo) {
        console.log('Adding remote player:', playerInfo);

        try {
            if (!playerInfo || !playerInfo.id || !playerInfo.playerType) {
                console.error('Invalid remote player info:', playerInfo);
                return;
            }

            // Don't add if already exists
            if (this.remotePlayers[playerInfo.id]) {
                console.log('Remote player already exists:', playerInfo.id);
                return;
            }

            // Create appropriate player type based on their selection
            let player;
            if (playerInfo.playerType === 'striker') {
                player = new Striker(this, playerInfo.x || 300, playerInfo.y || 360, true);
            } else if (playerInfo.playerType === 'keeper') {
                player = new Keeper(this, playerInfo.x || 200, playerInfo.y || 360, true);
            }

            if (player) {
                this.remotePlayers[playerInfo.id] = {
                    player: player,
                    playerType: playerInfo.playerType
                };
                console.log('✅ Remote player added successfully:', playerInfo.id);
            }
        } catch (error) {
            console.error('❌ Error adding remote player:', error);
        }
    }

    update(time, delta) {
        // Update our local player
        if (this.myPlayer) {
            this.myPlayer.update();
        }

        // Update all enemies
        this.enemyList.forEach(enemy => {
            if (enemy && enemy.container && enemy.container.active) {
                enemy.update();
            }
        });

        // Clean up destroyed enemies from the list
        this.enemyList = this.enemyList.filter(enemy =>
            enemy && enemy.container && enemy.container.active
        );

        // Collision: local striker's projectiles vs enemies
        if (this.myPlayer && this.myRole === 'striker' && this.myPlayer.projectiles) {
            this.physics.overlap(
                this.myPlayer.projectiles,
                this.enemies,
                this.hitEnemy,
                null,
                this
            );
        }

        // Collision: remote striker's projectiles vs enemies (so keeper sees hits too)
        Object.values(this.remotePlayers).forEach(remote => {
            if (remote.playerType === 'striker' && remote.player && remote.player.projectiles) {
                this.physics.overlap(
                    remote.player.projectiles,
                    this.enemies,
                    this.hitEnemy,
                    null,
                    this
                );
            }
        });

        // Collision: local keeper blocking vs enemies
        if (this.myPlayer && this.myRole === 'keeper' && this.myPlayer.isBlocking) {
            this.physics.overlap(
                this.myPlayer.container,
                this.enemies,
                this.blockEnemy,
                null,
                this
            );
        }

        // Collision: enemies vs local player (damage on contact, skip if keeper is blocking)
        if (this.myPlayer && !this.myPlayer.isInvincible && !this.myPlayer.isBlocking) {
            this.physics.overlap(
                this.myPlayer.container,
                this.enemies,
                this.enemyHitPlayer,
                null,
                this
            );
        }

        // Wave completion check (host only)
        if (this.isHost() && this.waveInProgress && this.enemyList.length === 0 && this.enemiesSpawned > 0) {
            this.completeWave();
        }
    }

    createStarfield() {
        for (let i = 0; i < 150; i++) {
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height);
            const star = this.add.circle(x, y, Phaser.Math.Between(1, 2), 0xffffff, 0.6);

            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(2000, 4000),
                yoyo: true,
                repeat: -1
            });
        }
    }

    createField() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Draw field outline
        const graphics = this.add.graphics();
        graphics.lineStyle(3, 0x00ff00, 0.5);
        graphics.strokeRect(50, 50, width - 100, height - 100);

        // Center circle
        graphics.lineStyle(2, 0x00ff00, 0.3);
        graphics.strokeCircle(width / 2, height / 2, 80);

        // Center line (vertical)
        graphics.lineBetween(width / 2, 50, width / 2, height - 50);
    }

    createShrine() {
        const width = this.cameras.main.width;

        const height = this.cameras.main.height;

        // Shrine base (large glowing crystal on LEFT side of screen)
        this.shrine = this.add.container(100, height / 2);

        // Outer glow - MUCH BIGGER and more visible
        const glow = this.add.circle(0, 0, 80, 0x9c27b0, 0.5);
        this.shrine.add(glow);

        // Main crystal - BIGGER
        const crystal = this.add.star(0, 0, 5, 40, 70, 0xe91e63);
        this.shrine.add(crystal);

        // Inner light - BIGGER
        const light = this.add.circle(0, 0, 30, 0xffffff, 0.9);
        this.shrine.add(light);

        // Shrine label
        const shrineLabel = this.add.text(0, -100, '⛩️ SACRED SHRINE ⛩️', {
            font: 'bold 20px Arial',
            fill: '#ff4081',
            stroke: '#000000',
            strokeThickness: 4
        });
        shrineLabel.setOrigin(0.5);
        this.shrine.add(shrineLabel);

        // Pulsing animation
        this.tweens.add({
            targets: [glow, crystal],
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Rotating animation for crystal
        this.tweens.add({
            targets: crystal,
            angle: 360,
            duration: 8000,
            repeat: -1,
            ease: 'Linear'
        });

        // Make sure shrine is on top layer
        this.shrine.setDepth(1000);
    }

    createUI() {
        const width = this.cameras.main.width;

        // Night indicator
        this.add.text(20, 20, `NIGHT ${this.currentNight}`, {
            font: 'bold 24px Arial',
            fill: '#ffeb3b',
            stroke: '#000000',
            strokeThickness: 4
        });

        // Shrine health
        this.shrineHealthText = this.add.text(width - 20, 20, 'SHRINE: 100%', {
            font: 'bold 20px Arial',
            fill: '#ff4081',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.shrineHealthText.setOrigin(1, 0);

        // Score
        this.scoreText = this.add.text(width / 2, 20, 'SCORE: 0', {
            font: 'bold 20px Arial',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.scoreText.setOrigin(0.5, 0);

        // Harmony meter background
        const harmonyBg = this.add.graphics();
        harmonyBg.fillStyle(0x333333, 0.8);
        harmonyBg.fillRect(width / 2 - 150, 60, 300, 20);

        // Harmony meter fill (will update this)
        this.harmonyBar = this.add.graphics();

        // Harmony label
        this.add.text(width / 2, 90, 'HARMONY', {
            font: 'bold 12px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5, 0);
    }

    updateHarmonyMeter(value) {
        this.harmonyMeter = Phaser.Math.Clamp(value, 0, 100);

        this.harmonyBar.clear();
        const gradient = this.harmonyMeter < 50 ? 0x00bcd4 : 0xff9800;
        this.harmonyBar.fillStyle(gradient, 0.9);
        this.harmonyBar.fillRect(
            this.cameras.main.width / 2 - 150,
            60,
            (300 * this.harmonyMeter) / 100,
            20
        );
    }

    damageShrine(amount) {
        this.shrineHealth -= amount;
        this.shrineHealth = Math.max(0, this.shrineHealth);
        this.shrineHealthText.setText(`SHRINE: ${this.shrineHealth}%`);

        // Sync shrine damage to other player
        if (this.socket) {
            this.socket.emit('shrineDamaged', { amount });
        }

        // Screen shake on damage
        this.cameras.main.shake(200, 0.01);

        if (this.shrineHealth <= 0) {
            this.gameOver();
        }
    }

    addScore(points) {
        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score}`);
    }

    // Host check: striker is the host who controls waves/spawning
    isHost() {
        return this.myRole === 'striker';
    }

    checkStartGame() {
        if (this.playersConnected >= 2 && !this.gameStarted) {
            this.gameStarted = true;
            console.log('🎮 Both players ready! Starting game in 2 seconds...');

            // Only the host (striker) starts waves
            if (this.isHost()) {
                this.time.delayedCall(2000, () => {
                    this.startNextWave();
                });
            }
        }
    }

    gameOver() {
        console.log('💔 Game Over!');
        // TODO: Implement game over screen
    }

    startNextWave() {
        this.currentWave++;
        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.enemyIdCounter = (this.enemyIdCounter || 0);

        // Sync wave start to other player
        if (this.socket) {
            this.socket.emit('waveSync', { action: 'start', wave: this.currentWave });
        }

        // Wave announcement
        const waveText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `WAVE ${this.currentWave}`,
            {
                font: 'bold 48px Arial',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        waveText.setOrigin(0.5);

        this.tweens.add({
            targets: waveText,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 2000,
            onComplete: () => waveText.destroy()
        });

        // Calculate wave difficulty
        const enemiesToSpawn = calculateWaveEnemies(this.currentWave);
        const spawnInterval = calculateSpawnInterval(this.currentWave);

        // Spawn enemies over time (host only)
        let spawned = 0;
        this.waveTimer = this.time.addEvent({
            delay: spawnInterval,
            callback: () => {
                if (spawned < enemiesToSpawn) {
                    this.spawnEnemy();
                    spawned++;
                    this.enemiesSpawned++;
                }
            },
            loop: true
        });

        console.log(`🌊 Wave ${this.currentWave} started! ${enemiesToSpawn} enemies incoming!`);
    }

    spawnEnemy() {
        const height = this.cameras.main.height;
        const x = this.cameras.main.width + 50; // Spawn off right edge
        const y = Phaser.Math.Between(100, height - 100);
        const type = selectEnemyType(this.currentWave);
        const enemyId = `e-${++this.enemyIdCounter}-${Date.now()}`;

        // Sync spawn to other player
        if (this.socket) {
            this.socket.emit('spawnEnemy', { x, y, type, enemyId });
        }

        this.spawnEnemyAt(x, y, type, enemyId);
    }

    // Shared spawn logic used by both host and remote
    spawnEnemyAt(x, y, type, enemyId) {
        const enemy = new Enemy(this, x, y, type);
        enemy.syncId = enemyId;
        this.enemyList.push(enemy);
        this.enemies.add(enemy.getContainer());
    }

    completeWave() {
        if (this.waveTimer) {
            this.waveTimer.remove();
        }

        this.waveInProgress = false;

        // Wave complete bonus
        const bonus = calculateWaveBonus(this.currentWave);
        this.addScore(bonus);

        // Sync wave complete and score to other player
        if (this.socket) {
            this.socket.emit('waveSync', { action: 'complete', wave: this.currentWave, bonus });
            this.socket.emit('scoreUpdate', { score: this.score, harmony: this.harmonyMeter });
        }

        // Show wave complete message
        const completeText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `WAVE ${this.currentWave} COMPLETE!\n+${bonus} BONUS`,
            {
                font: 'bold 36px Arial',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 5,
                align: 'center'
            }
        );
        completeText.setOrigin(0.5);

        this.tweens.add({
            targets: completeText,
            alpha: 0,
            y: completeText.y - 50,
            duration: 3000,
            onComplete: () => completeText.destroy()
        });

        // Start next wave after delay (host only)
        if (this.isHost()) {
            this.time.delayedCall(4000, () => {
                this.startNextWave();
            });
        }

        console.log(`✅ Wave ${this.currentWave} complete! Starting next wave soon...`);
    }

    hitEnemy(projectile, enemyContainer) {
        const enemy = this.enemyList.find(e => e.container === enemyContainer);

        if (enemy) {
            const destroyed = enemy.takeDamage(1);

            if (destroyed) {
                this.addScore(enemy.stats.points);
                this.enemiesKilled++;
                this.updateHarmonyMeter(this.harmonyMeter + 5);
                this.enemyList = this.enemyList.filter(e => e !== enemy);

                // Sync kill and score to other player
                if (this.socket) {
                    this.socket.emit('enemyKilled', { enemyId: enemy.syncId });
                    this.socket.emit('scoreUpdate', { score: this.score, harmony: this.harmonyMeter });
                }
            }

            projectile.destroy();
        }
    }

    blockEnemy(keeperContainer, enemyContainer) {
        const enemy = this.enemyList.find(e => e.container === enemyContainer);

        if (enemy) {
            const destroyed = enemy.takeDamage(enemy.health);

            if (destroyed) {
                this.addScore(calculateBlockScore(enemy.stats.points));
                this.enemiesKilled++;
                this.updateHarmonyMeter(this.harmonyMeter + 10);
                this.enemyList = this.enemyList.filter(e => e !== enemy);

                // Sync kill and score to other player
                if (this.socket) {
                    this.socket.emit('enemyKilled', { enemyId: enemy.syncId });
                    this.socket.emit('scoreUpdate', { score: this.score, harmony: this.harmonyMeter });
                }

                // Visual feedback
                const blockText = this.add.text(
                    keeperContainer.x,
                    keeperContainer.y - 30,
                    'BLOCKED!',
                    { font: 'bold 16px Arial', fill: '#00bcd4' }
                );
                blockText.setOrigin(0.5);
                this.tweens.add({
                    targets: blockText,
                    y: blockText.y - 30, alpha: 0,
                    duration: 1000, onComplete: () => blockText.destroy()
                });
            }
        }
    }

    enemyHitPlayer(playerContainer, enemyContainer) {
        if (this.myPlayer.isInvincible) return;

        const enemy = this.enemyList.find(e => e.container === enemyContainer);
        if (!enemy) return;

        const isDead = this.myPlayer.takeDamage(enemy.stats.damage);

        // Destroy the enemy on contact
        enemy.takeDamage(999);
        this.enemyList = this.enemyList.filter(e => e !== enemy);
        this.enemiesKilled++;

        // Sync damage and enemy kill to other player
        if (this.socket) {
            this.socket.emit('playerDamaged', { health: this.myPlayer.health });
            this.socket.emit('enemyKilled', { enemyId: enemy.syncId });
        }

        // Camera shake on hit
        this.cameras.main.shake(200, 0.01);

        if (isDead) {
            this.playerDeath();
        }
    }

    playerDeath() {
        // Show death text
        const deathText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'YOU DIED!',
            { font: 'bold 48px Arial', fill: '#ff0000', stroke: '#000000', strokeThickness: 6 }
        );
        deathText.setOrigin(0.5);
        deathText.setDepth(2000);

        this.cameras.main.shake(500, 0.03);

        // Disable physics so enemy can't hit again
        this.myPlayer.container.body.enable = false;

        // Play death animation, then hide and respawn
        this.myPlayer.playDeathAnimation(() => {
            this.myPlayer.container.setVisible(false);

            // Respawn after a delay
            this.time.delayedCall(2000, () => {
                if (this.myPlayer) {
                    const startX = this.myRole === 'striker' ? 300 : 200;
                    this.myPlayer.respawn(startX, 360);
                    this.myPlayer.container.setVisible(true);
                    this.myPlayer.container.body.enable = true;

                    // Sync respawn health to other player
                    if (this.socket) {
                        this.socket.emit('playerDamaged', { health: this.myPlayer.health });
                    }
                }
                deathText.destroy();
            });
        });
    }
}
