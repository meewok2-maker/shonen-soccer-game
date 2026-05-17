import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockScene } from '../__mocks__/createMockScene.js';
import BootScene from '../../src/scenes/BootScene.js';

describe('BootScene', () => {
    let bootScene;

    beforeEach(() => {
        bootScene = new BootScene();
        const mockScene = createMockScene();
        Object.assign(bootScene, mockScene);
        // BootScene.preload uses this.make.text
        bootScene.make = {
            text: vi.fn(() => ({
                setOrigin: vi.fn(),
            })),
        };
    });

    describe('preload', () => {
        it('sets up loading progress handler', () => {
            bootScene.preload();
            expect(bootScene.load.on).toHaveBeenCalledWith('progress', expect.any(Function));
        });

        it('loads striker atlas', () => {
            bootScene.preload();
            expect(bootScene.load.atlas).toHaveBeenCalledWith(
                'striker-sheet',
                '/assets/sprite-sheet-striker.png',
                '/assets/striker-atlas.json'
            );
        });

        it('creates progress bar graphics', () => {
            bootScene.preload();
            expect(bootScene.add.graphics).toHaveBeenCalled();
        });
    });

    describe('create', () => {
        it('transitions to MainMenuScene', () => {
            bootScene.create();
            expect(bootScene.scene.start).toHaveBeenCalledWith('MainMenuScene');
        });

        it('creates striker animations', () => {
            bootScene.create();
            expect(bootScene.anims.create).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'striker-idle' })
            );
            expect(bootScene.anims.create).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'striker-attack' })
            );
            expect(bootScene.anims.create).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'striker-hurt' })
            );
        });
    });
});
