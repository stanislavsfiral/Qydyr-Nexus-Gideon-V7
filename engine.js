let scene, camera, renderer, controls, mainGroup;
let smoothResonance = 0.5, vCanvas, vCtx;
window.GIDEON_AXIS = 'Y';
let currentThickness = 3.5;
const R = 150, H = 200;

function getSfiralPath() {
    const pts = [];
    const j_z = H / 5;
    // 4-сегментная модель
    for (let i = 0; i <= 250; i++) {
        let t = i / 250;
        pts.push(new THREE.Vector3(R*Math.cos(Math.PI*2*t), R*Math.sin(Math.PI*2*t), H-(H-j_z)*t));
    }
    for (let i = 1; i <= 150; i++) {
        let t = i / 150;
        pts.push(new THREE.Vector3(R/2+(R/2)*Math.cos(Math.PI*t), (R/2)*Math.sin(Math.PI*t), j_z-(j_z*t)));
    }
    const half = [...pts].reverse();
    for (let p of half) pts.push(new THREE.Vector3(-p.x, -p.y, -p.z));
    return pts;
}

function initCoreSystem() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000205);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 20000);
    camera.position.set(800, 600, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    mainGroup = new THREE.Group();
    scene.add(mainGroup);
    vCanvas = document.createElement('canvas');
    vCanvas.width = 512; vCanvas.height = 32;
    vCtx = vCanvas.getContext('2d');
    rebuildCore();
    animate();
}

function createCable(thick) {
    const pts = getSfiralPath();
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 512, thick, 8, false);
    const tex = new THREE.CanvasTexture(vCanvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    return new THREE.Mesh(geo, mat);
}

window.rebuildCore = function() {
    if(!mainGroup) return;
    while(mainGroup.children.length > 0) {
        const g = mainGroup.children[0];
        g.children.forEach(m => { if(m.geometry) m.geometry.dispose(); });
        mainGroup.remove(g);
    }
    const master = createCable(currentThickness);
    const step = (Math.PI * 2) / 12;
    const ax = window.GIDEON_AXIS.toLowerCase();
    for (let n = 0; n < 12; n++) {
        const p = new THREE.Group();
        const s1 = master.clone(); p.add(s1);
        const s2 = master.clone(); s2.rotation.y = Math.PI; p.add(s2);
        p.rotation[ax] = step * n;
        mainGroup.add(p);
    }
}

window.updateThickness = function(v) { currentThickness = v; rebuildCore(); };

function animate() {
    requestAnimationFrame(animate);
    if (window.gVideo && window.gVideo.readyState === 4 && !window.gVideo.paused) {
        vCtx.drawImage(window.gVideo, 0, 0, 512, 32);
        mainGroup.children.forEach(g => g.children.forEach(m => { if(m.material.map) m.material.map.needsUpdate = true; }));
        smoothResonance += (0.99 - smoothResonance) * 0.05;
    } else {
        vCtx.fillStyle = '#00050a'; vCtx.fillRect(0,0,512,32);
        smoothResonance += (0.05 - smoothResonance) * 0.01;
    }
    const coh = document.getElementById('coh-val');
    if(coh) coh.innerText = (smoothResonance * 100).toFixed(2).replace('.', ',') + "%";
    if(mainGroup) mainGroup.rotation.y += 0.001;
    controls.update();
    renderer.render(scene, camera);
}
initCoreSystem();