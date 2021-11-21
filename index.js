import { 
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Mesh,
  MeshNormalMaterial,
  BoxGeometry,
} from 'three';

const renderer = new WebGLRenderer();
renderer.setSize(500, 500);

const scene = new Scene();
const material = new MeshNormalMaterial();

const geometry = new BoxGeometry(0.2, 0.2, 0.2);
const mesh = new Mesh(geometry, material);

const camera = new PerspectiveCamera(70, 1, 0.01, 20);
camera.z = 1;

document.body.appendChild(renderer.domElement);

renderer.render(scene, camera);
