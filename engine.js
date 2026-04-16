const npyLoader = new npyjs();
let scene, camera, renderer, controls, mainGroup;
let smoothResonance = 0.5;
let vCanvas, vCtx;

window.GIDEON_AXIS = window.GIDEON_AXIS || 'Y';
window.GIDEON_COUNT = window.GIDEON_COUNT || 12;
let currentThickness = 3.5;
const R = 150, H = 200;

function initCoreSystem() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000205);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 15000);
    camera.position.set(0, 500, 1200);

    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Холст для видео-пикселей (512 по длине)
    vCanvas = document.createElement('canvas');
    vCanvas.width = 512; vCanvas.height = 32;
    vCtx = vCanvas.getContext('2d', {willReadFrequently: true});

    rebuildCore();
    animate();
}

// ТВОЯ ПРАВИЛЬНАЯ ГЕОМЕТРИЯ
function getSfiralPath() {
    let pts = [];
    let junctionZ = H / 5;
    
    // Верхний виток
    for (let i = 0; i <= 250; i++) {
        let t = i / 250;
        pts.push(new THREE.Vector3(R * Math.cos(Math.PI*2*t), R * Math.sin(Math.PI*2*t), THREE.MathUtils.lerp(H, junctionZ, t)));
    }
    // S-переход
    for (let i = 0; i <= 150; i++) {
        let t = i / 150;
        pts.push(new THREE.Vector3(R/2 + (R/2)*Math.cos(Math.PI*t), (R/2)*Math.sin(Math.PI*t), THREE.MathUtils.lerp(junctionZ, 0, t)));
    }
    // Отражение
    let halfLen = pts.length;
    for (let i = halfLen - 1; i >= 0; i--) {
        let p = pts[i]; pts.push(new THREE.Vector3(-p.x, -p.y, -p.z));
    }
    return new THREE.CatmullRomCurve3(pts);
}

function createCable(thickness) {
    const curve = getSfiralPath();
    
    // ГЕОМЕТРИЯ: Путь по формуле, 512 сегментов (пикселей), Толщина, 8 граней обхвата
    const geo = new THREE.TubeGeometry(curve, 512, thickness, 8, false);
    
    // Текстура видео (если gVideo нет, будет черный экран с эмиссией)
    const videoElement = window.gVideo || vCanvas;
    const tex = new THREE.VideoTexture(videoElement);
    
    const mat = new THREE.MeshBasicMaterial({ 
        map: tex,
        transparent: true, 
        opacity: 0.85, 
        blending: THREE.AdditiveBlending, 
        side: THREE.DoubleSide
    });
    
    const cableGroup = new THREE.Group();
    cableGroup.add(new THREE.Mesh(geo, mat));
    return cableGroup;
}

window.rebuildCore = function() {
    if(!mainGroup) return;
    while(mainGroup.children.length > 0) {
        const c = mainGroup.children[0];
        if(c.isGroup) c.children.forEach(m => { if(m.geometry) m.geometry.dispose(); });
        mainGroup.remove(c);
    }
    
    const master = createCable(currentThickness);
    const count = window.GIDEON_COUNT || 12;
    const step = (Math.PI * 2) / count;
    const axis = (window.GIDEON_AXIS || 'Y').toLowerCase();

    for (let n = 0; n < count; n++) {
        const pair = new THREE.Group();
        const s1 = master.clone(); pair.add(s1);
        const s2 = master.clone(); s2.rotation.y = Math.PI; pair.add(s2);
        pair.rotation[axis] = step * n;
        mainGroup.add(pair);
    }
}

window.updateThickness = function(val) {
    currentThickness = val;
    if (mainGroup) rebuildCore();
};

function animate() {
    requestAnimationFrame(animate);
    
    if (window.gVideo && window.gVideo.readyState === 4) {
        vCtx.drawImage(window.gVideo, 0, 0, 512, 32);
        // Резонанс для телеметрии
        const br = vCtx.getImageData(256, 16, 1, 1).data[0] / 255;
        smoothResonance = (smoothResonance * 0.9) + (br * 0.1);
        const coh = document.getElementById('coh-val');
        if(coh) coh.innerText = (smoothResonance * 100).toFixed(2) + "%";
    }
    
    if (controls) controls.update();
    renderer.render(scene, camera);
}

window.onload = initCoreSystem;