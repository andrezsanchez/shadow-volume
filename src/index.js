import { 
  Vector3,
  Vector4,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Mesh,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  BoxGeometry,
  ParametricGeometry,
  DoubleSide,
  CullFaceNone,
  CullFaceBack,
  CullFaceFront
} from 'three';

const vertexShader = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
void main() {
  gl_FragColor = vec4(0.8, 0.8, 0.8, 1.0);
}
`;

const shadowFragmentShader = `
uniform vec4 color;
void main() {
  gl_FragColor = color;
}
`;

const mainElement = document.getElementsByTagName('main')[0];
const canvasElement = document.getElementsByTagName('canvas')[0];

const renderer = new WebGLRenderer({
  canvas: canvasElement,
});

renderer.autoClear = false;

const boxGeometry = new BoxGeometry(1, 1, 1);
const geometry = new ParametricGeometry(
  (u, v, dest) => {
    dest.x = -((u - 0.5) * 5);
    dest.z = (v - 0.5) * 5;
    dest.y = (Math.sin(u * u * 6) - Math.sin(v * v * 6)) * 0.2;
  },
  20,
  20
);

function createPolygonFan(path, height, ccw) {
  const fan = [];
  for (let i = 2; i < path.length - 2; i += 2) {
    fan.push(path[0], height, path[1]);
    if (ccw) {
      fan.push(path[i + 0], height, path[i + 1]);
      fan.push(path[i + 2], height, path[i + 3]);
    } else {                      
      fan.push(path[i + 2], height, path[i + 3]);
      fan.push(path[i + 0], height, path[i + 1]);
    }
  }

  return fan;
}

function createPolygonSideStrip(path, lowZ, highZ) {
  const strip = [];
  for (let i = 0; i < path.length - 2; i += 2) {
    strip.push(path[i], highZ, path[i + 1]);
    strip.push(path[i], lowZ, path[i + 1]);
    strip.push(path[i + 2], highZ, path[i + 3]);

    strip.push(path[i + 2], highZ, path[i + 3]);
    strip.push(path[i], lowZ, path[i + 1]);
    strip.push(path[i + 2], lowZ, path[i + 3]);
  }
  strip.push(path[path.length - 2], highZ, path[path.length - 1]);
  strip.push(path[path.length - 2], lowZ, path[path.length - 1]);
  strip.push(path[0], highZ, path[1]);

  strip.push(path[0], highZ, path[1]);
  strip.push(path[path.length - 2], lowZ, path[path.length - 1]);
  strip.push(path[0], lowZ, path[1]);

  return strip;
}

const polygon = [
  -2, -2,
  2, -2,
  2, 2,
  -2, 2,
  -2, -2,
  -1.95, -1.95,
  -1.95, 1.95,
  1.95, 1.95,
  1.95, -1.95,
  -1.95, -1.95,
];

const polygonGeometry = new BufferGeometry();
polygonGeometry.addAttribute(
  'position',
  new BufferAttribute(
    new Float32Array([
      ...createPolygonFan(polygon, 100, true),
      ...createPolygonFan(polygon, -100, false),
      ...createPolygonSideStrip(polygon, -100, 100),
    ]),
    3
  )
);

const meshMaterial = new ShaderMaterial({ vertexShader, fragmentShader });

const mesh = new Mesh(geometry, meshMaterial);

const camera = new PerspectiveCamera(70, 500 / 500, 0.01, 10000);
camera.position.set(-0.6, 3.5, 0);
camera.position.set(2.5, 2.5, 2.5);
camera.lookAt(new Vector3(0, 0, 0));

function resize() {
  const box = mainElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  const width = box.width;
  const height = box.height;
  renderer.setSize(width, height);
  renderer.devicePixelRatio = dpr;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
resize();

const scene = new Scene();
scene.add(mesh);

const shadowMeshMaterial = new ShaderMaterial({
  vertexShader,
  fragmentShader: shadowFragmentShader,
  uniforms: {
    color: { value: new Vector4(0, 0, 1, 0.5) },
  },
});
shadowMeshMaterial.side = DoubleSide;

const shadowMeshMaterialRed = new ShaderMaterial({
  vertexShader,
  fragmentShader: shadowFragmentShader,
  uniforms: {
    color: { value: new Vector4(1, 0, 0, 0.5) },
  },
});
shadowMeshMaterialRed.side = DoubleSide;

const polygonMesh = new Mesh(polygonGeometry, shadowMeshMaterial);
const volumeScene = new Scene();
volumeScene.add(polygonMesh);

const volumeMesh = new Mesh(new BoxGeometry(1, -1, -1), shadowMeshMaterial);
volumeMesh.scale.y = 100;
volumeMesh.position.set(2, 0, 0);
//volumeScene.add(volumeMesh);

//const volumeMesh2 = new Mesh(boxGeometry, shadowMeshMaterial);
//volumeMesh2.position.set(0, 0, 0);
//volumeMesh2.scale.x = 1.8;
//volumeMesh2.scale.z = 1.8;
//volumeMesh2.scale.y = 100;
//volumeScene.add(volumeMesh2);

const volumeSceneRed = new Scene();
const volumeMeshRed = new Mesh(boxGeometry, shadowMeshMaterialRed);
volumeMeshRed.position.set(-1.1, 0, 0);
volumeMeshRed.scale.y = 100;
//volumeSceneRed.add(volumeMeshRed);

const gl = renderer.context;

const stencilDefault = 0;

function render(time) {
  requestAnimationFrame(render);

  renderer.clear(true, true, true);
  renderer.state.setCullFace(CullFaceBack);
  renderer.render(scene, camera);

  gl.clearStencil(stencilDefault);
  renderer.clear(false, false, true);

  function renderVolumeZFail(thisScene) {
    gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
    gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.INCR_WRAP, gl.KEEP);
    gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.DECR_WRAP, gl.KEEP);
    gl.depthMask(false);
    gl.enable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(false, false, false, false);
    renderer.state.setCullFace(CullFaceNone);
    renderer.render(thisScene, camera);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.STENCIL_TEST);
    gl.depthMask(true);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.stencilFunc(gl.NOTEQUAL, stencilDefault, 0xFF);
    gl.depthFunc(gl.GEQUAL);
    gl.enable(gl.STENCIL_TEST);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.depthMask(false);
    renderer.state.setCullFace(CullFaceFront);
    renderer.render(thisScene, camera);
    gl.depthMask(true);
    gl.disable(gl.STENCIL_TEST);
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.BLEND);
  }

  function renderVolumeZPass(thisScene) {
    gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
    gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
    gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
    gl.depthMask(false);
    gl.enable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(false, false, false, false);
    renderer.state.setCullFace(CullFaceNone);
    renderer.render(thisScene, camera);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.STENCIL_TEST);
    gl.depthMask(true);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.stencilFunc(gl.NOTEQUAL, stencilDefault, 0xFF);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.STENCIL_TEST);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.depthMask(false);
    renderer.state.setCullFace(CullFaceBack);
    renderer.render(thisScene, camera);
    gl.depthMask(true);
    gl.disable(gl.STENCIL_TEST);
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.BLEND);
  }

  //renderVolumeZPass(volumeSceneRed);
  //renderVolumeZPass(volumeScene);

  renderVolumeZFail(volumeSceneRed);
  renderVolumeZFail(volumeScene);

  mesh.rotation.y = time / 1000;
}
render();

window.addEventListener('resize', resize);
