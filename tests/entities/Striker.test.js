import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockScene } from '../__mocks__/createMockScene.js';
import Striker from '../../src/entities/Striker.js';

describe('Striker', () => {
    let scene;

    beforeEach(() => {
        scene = createMockScene();
    });

    describe('constructor', () => {
        it('initializes with correct default properties', () => {
            const striker = new Striker(scene, 100, 200);
            expect(striker.speed).toBe(250);
            expect(striker.canShoot).toBe(true);
            expect(striker.shootCooldown).toBe(300);
            expect(striker.isRemote).toBe(false);
        });

        it('creates container at given position', () => {
            new Striker(scene, 100, 200);
            expect(scene.add.container).toHaveBeenCalledWith(100, 200);
        });

        it('sets up keyboard input for local player', () => {
            const striker = new Striker(scene, 100, 200, false);
            expect(scene.input.keyboard.addKeys).toHaveBeenCalled();
            expect(striker.cursors).toBeDefined();
        });

        it('does NOT set up keyboard input for remote player', () => {
            const striker = new Striker(scene, 100, 200, true);
            expect(scene.input.keyboard.addKeys).not.toHaveBeenCalled();
            expect(striker.cursors).toBeUndefined();
        });

        it('creates physics body with correct dimensions', () => {
            const striker = new Striker(scene, 100, 200);
            expect(scene.physics.add.existing).toHaveBeenCalledWith(striker.container);
            expect(striker.container.body.setSize).toHaveBeenCalledWith(40, 60);
            expect(striker.container.body.setOffset).toHaveBeenCalledWith(-20, -30);
        });

        it('sets depth to 75', () => {
            const striker = new Striker(scene, 100, 200);
            expect(striker.container.setDepth).toHaveBeenCalledWith(75);
        });

        it('creates projectiles group', () => {
            new Striker(scene, 100, 200);
            expect(scene.add.group).toHaveBeenCalled();
        });

        it('creates sprite from atlas', () => {
            new Striker(scene, 100, 200);
            expect(scene.add.sprite).toHaveBeenCalledWith(0, 0, 'striker-sheet', 'idle_0');
        });

        it('initializes health system', () => {
            const striker = new Striker(scene, 100, 200);
            expect(striker.health).toBe(100);
            expect(striker.maxHealth).toBe(100);
            expect(striker.isInvincible).toBe(false);
        });
    });

    describe('update', () => {
        it('sets velocity from left key', () => {
            const striker = new Striker(scene, 100, 200);
            striker.cursors.left.isDown = true;
            striker.update();
            expect(striker.container.body.setVelocity).toHaveBeenCalledWith(-250, 0);
        });

        it('sets velocity from right+down keys', () => {
            const striker = new Striker(scene, 100, 200);
            striker.cursors.right.isDown = true;
            striker.cursors.down.isDown = true;
            striker.update();
            expect(striker.container.body.setVelocity).toHaveBeenCalledWith(250, 250);
        });

        it('sets zero velocity when no keys pressed', () => {
            const striker = new Striker(scene, 100, 200);
            striker.update();
            expect(striker.container.body.setVelocity).toHaveBeenCalledWith(0, 0);
        });

        it('does nothing for remote players', () => {
            const striker = new Striker(scene, 100, 200, true);
            striker.update();
            expect(striker.container.body.setVelocity).not.toHaveBeenCalled();
        });

        it('calls shoot when space is pressed and canShoot', () => {
            const striker = new Striker(scene, 100, 200);
            const shootSpy = vi.spyOn(striker, 'shoot');
            striker.cursors.shoot.isDown = true;
            striker.canShoot = true;
            striker.update();
            expect(shootSpy).toHaveBeenCalled();
        });

        it('emits position to socket when connected', () => {
            const striker = new Striker(scene, 100, 200);
            scene.socket = { emit: vi.fn() };
            striker.update();
            expect(scene.socket.emit).toHaveBeenCalledWith('playerMovement', {
                x: striker.container.x,
                y: striker.container.y,
                playerType: 'striker'
            });
        });
    });

    describe('shoot', () => {
        it('sets canShoot to false', () => {
            const striker = new Striker(scene, 100, 200);
            striker.shoot();
            expect(striker.canShoot).toBe(false);
        });

        it('creates a physics sprite for the ball', () => {
            const striker = new Striker(scene, 100, 200);
            striker.shoot();
            expect(scene.physics.add.sprite).toHaveBeenCalled();
        });

        it('schedules cooldown reset', () => {
            const striker = new Striker(scene, 100, 200);
            striker.shoot();
            const calls = scene.time.delayedCall.mock.calls;
            const cooldownCall = calls.find(c => c[0] === 300);
            expect(cooldownCall).toBeDefined();
        });

        it('plays attack animation', () => {
            const striker = new Striker(scene, 100, 200);
            striker.shoot();
            expect(striker.sprite.play).toHaveBeenCalledWith('striker-attack');
        });
    });

    describe('setPosition', () => {
        it('updates container coordinates', () => {
            const striker = new Striker(scene, 100, 200);
            striker.setPosition(300, 400);
            expect(striker.container.x).toBe(300);
            expect(striker.container.y).toBe(400);
        });
    });

    describe('destroy', () => {
        it('destroys container and clears projectiles', () => {
            const striker = new Striker(scene, 100, 200);
            striker.destroy();
            expect(striker.container.destroy).toHaveBeenCalled();
            expect(striker.projectiles.clear).toHaveBeenCalledWith(true, true);
        });
    });
});
