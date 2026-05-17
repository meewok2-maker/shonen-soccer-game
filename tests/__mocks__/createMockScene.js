import { vi } from 'vitest';

export function createMockContainer(x = 0, y = 0) {
    return {
        x, y,
        add: vi.fn(),
        destroy: vi.fn(),
        setDepth: vi.fn(),
        sendToBack: vi.fn(),
        active: true,
        body: {
            setCollideWorldBounds: vi.fn(),
            setSize: vi.fn(),
            setOffset: vi.fn(),
            setVelocity: vi.fn(),
            velocity: { x: 0, y: 0 },
            setAllowGravity: vi.fn(),
            enable: true,
        }
    };
}

export function createMockScene() {
    const mockContainer = createMockContainer();

    const scene = {
        add: {
            container: vi.fn((x, y) => createMockContainer(x, y)),
            graphics: vi.fn(() => ({
                fillStyle: vi.fn(),
                fillCircle: vi.fn(),
                fillRect: vi.fn(),
                lineStyle: vi.fn(),
                strokeCircle: vi.fn(),
                strokeRect: vi.fn(),
                lineBetween: vi.fn(),
                generateTexture: vi.fn(),
                destroy: vi.fn(),
                clear: vi.fn(),
            })),
            sprite: vi.fn((x, y, key) => ({
                x, y, key,
                setDepth: vi.fn(),
                setOrigin: vi.fn(),
                setScale: vi.fn(),
                setFlipX: vi.fn(),
                setAlpha: vi.fn(),
                play: vi.fn(),
                once: vi.fn((event, cb) => cb && cb()),
                anims: { currentAnim: null },
                body: {
                    setAllowGravity: vi.fn(),
                    setCollideWorldBounds: vi.fn(),
                    setVelocity: vi.fn(),
                    velocity: { x: 0, y: 0 },
                },
                active: true,
                destroy: vi.fn(),
            })),
            circle: vi.fn((x, y, r, color, alpha) => ({
                x, y,
                setStrokeStyle: vi.fn(),
                setAlpha: vi.fn(),
                setOrigin: vi.fn(),
                destroy: vi.fn(),
            })),
            star: vi.fn(() => ({ destroy: vi.fn() })),
            group: vi.fn(() => ({
                add: vi.fn(),
                remove: vi.fn(),
                clear: vi.fn(),
            })),
            text: vi.fn((x, y, text, style) => ({
                x, y, text,
                setOrigin: vi.fn().mockReturnThis(),
                setText: vi.fn(),
                setFill: vi.fn(),
                setScale: vi.fn(),
                setInteractive: vi.fn().mockReturnThis(),
                on: vi.fn().mockReturnThis(),
                destroy: vi.fn(),
            })),
        },
        physics: {
            add: {
                existing: vi.fn((obj) => {
                    if (!obj.body) {
                        obj.body = {
                            setCollideWorldBounds: vi.fn(),
                            setSize: vi.fn(),
                            setOffset: vi.fn(),
                            setVelocity: vi.fn(),
                            setVelocityX: vi.fn(),
                            setVelocityY: vi.fn(),
                            setAllowGravity: vi.fn(),
                            velocity: { x: 0, y: 0 },
                            enable: true,
                        };
                    }
                    return obj;
                }),
                group: vi.fn(() => ({
                    add: vi.fn(),
                    remove: vi.fn(),
                    clear: vi.fn(),
                })),
                sprite: vi.fn((x, y, key) => ({
                    x, y, key,
                    setDepth: vi.fn(),
                    body: {
                        setAllowGravity: vi.fn(),
                        setCollideWorldBounds: vi.fn(),
                        setVelocity: vi.fn(),
                        velocity: { x: 0, y: 0 },
                    },
                    active: true,
                    destroy: vi.fn(),
                })),
            },
            overlap: vi.fn(),
        },
        textures: {
            exists: vi.fn(() => false),
        },
        tweens: {
            add: vi.fn(() => ({})),
        },
        time: {
            delayedCall: vi.fn((delay, cb) => ({ delay, cb, remove: vi.fn() })),
            addEvent: vi.fn((config) => ({ remove: vi.fn(), config })),
        },
        input: {
            keyboard: {
                addKeys: vi.fn((keys) => {
                    const result = {};
                    for (const key of Object.keys(keys)) {
                        result[key] = { isDown: false };
                    }
                    return result;
                }),
                createCursorKeys: vi.fn(() => ({
                    up: { isDown: false },
                    down: { isDown: false },
                    left: { isDown: false },
                    right: { isDown: false },
                })),
                addKey: vi.fn(() => ({ isDown: false })),
            },
        },
        cameras: {
            main: {
                width: 1280,
                height: 720,
                shake: vi.fn(),
                fade: vi.fn(),
            },
        },
        load: {
            on: vi.fn(),
            image: vi.fn(),
            spritesheet: vi.fn(),
            atlas: vi.fn(),
        },
        anims: {
            create: vi.fn(),
            generateFrameNumbers: vi.fn(() => []),
        },
        scene: {
            start: vi.fn(),
        },
        socket: null,
    };

    return scene;
}
