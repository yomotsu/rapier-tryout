import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GLTFLoader } from 'THREE/examples/jsm/loaders/GLTFLoader.js';
import { RapierRaycastVehicle } from './lib/rapier-raycast-vehicle';
import { loadEnvMap } from './envMap';

await RAPIER.init();

const state = {
	running: true,
};

// based on
// https://github.com/isaac-mason/sketches/blob/main/src/sketches/rapier/raycast-vehicle/lib/rapier-raycast-vehicle.ts

// base
const gravity = { x: 0, y: -9.81, z: 0 };
const world = new RAPIER.World( gravity );

const width  = window.innerWidth;
const height = window.innerHeight;
const clock = new THREE.Clock();
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, width / height, 0.01, 1000 );
camera.position.set( 0, 1, 3 );
// camera.lookAt( 0, 0, 0 );
const renderer = new THREE.WebGLRenderer( { stencil: false } );
renderer.setSize( width, height );
document.body.appendChild( renderer.domElement );

loadEnvMap( renderer ).then( ( envMapRenderTarget ) => {

	scene.environment = envMapRenderTarget.texture;

} );

scene.add(
	new THREE.HemisphereLight( 0x443333, 0x332222 ),
	new THREE.AmbientLight( 0x999999 ),
);


const groundMesh = new THREE.Mesh(
	new THREE.BoxGeometry( 20, 0.1, 20 ),
	new THREE.MeshNormalMaterial( { wireframe: false } )
);
groundMesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), 0 * THREE.MathUtils.DEG2RAD );
scene.add( groundMesh );

const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
const groundRigidBody = world.createRigidBody(groundRigidBodyDesc);
const groundColliderDesc = RAPIER.ColliderDesc.cuboid(
	groundMesh.geometry.parameters.width / 2,
	groundMesh.geometry.parameters.height / 2,
	groundMesh.geometry.parameters.depth / 2
);
groundColliderDesc.setTranslation( groundMesh.position.x, groundMesh.position.y, groundMesh.position.z );
groundColliderDesc.setRotation( new RAPIER.Quaternion( groundMesh.quaternion.x, groundMesh.quaternion.y, groundMesh.quaternion.z, groundMesh.quaternion.w ) );
world.createCollider( groundColliderDesc, groundRigidBody );

const obstacleMesh = new THREE.Mesh(
	new THREE.BoxGeometry( 5, 5, 5 ),
	new THREE.MeshNormalMaterial( { wireframe: true } )
);

obstacleMesh.position.set( 6, 0, -2 );
obstacleMesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), 60 * THREE.MathUtils.DEG2RAD );
scene.add( obstacleMesh );

const obstacleRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
const obstacleRigidBody = world.createRigidBody(obstacleRigidBodyDesc);
const obstacleColliderDesc = RAPIER.ColliderDesc.cuboid(
	obstacleMesh.geometry.parameters.width / 2,
	obstacleMesh.geometry.parameters.height / 2,
	obstacleMesh.geometry.parameters.depth / 2
);
obstacleColliderDesc.setTranslation( obstacleMesh.position.x, obstacleMesh.position.y, obstacleMesh.position.z );
obstacleColliderDesc.setRotation( new RAPIER.Quaternion( obstacleMesh.quaternion.x, obstacleMesh.quaternion.y, obstacleMesh.quaternion.z, obstacleMesh.quaternion.w ) );
world.createCollider( obstacleColliderDesc, obstacleRigidBody );



const gltf = await new GLTFLoader().loadAsync( '/car.glb' );
gltf.scene.traverse( ( object ) => {

	if ( ! ( object instanceof THREE.Mesh ) ) return;

	const geometry = object.geometry;
	geometry.rotateY( Math.PI / 2 );

} );

const carBodyMesh = gltf.scene.children[ 0 ] as THREE.Mesh;
const carBodyMeshSize = new THREE.Box3().setFromObject( carBodyMesh ).getSize( new THREE.Vector3() );

const tireFrontLeftMesh = gltf.scene.children[ 1 ] as THREE.Mesh;
const tireFrontRightMesh = tireFrontLeftMesh.clone();
const tireRearLeftMesh = tireFrontLeftMesh.clone();
const tireRearRightMesh = tireFrontLeftMesh.clone();

const tireMeshSize = new THREE.Box3().setFromObject( tireFrontLeftMesh ).getSize( new THREE.Vector3() );
const tireRadius = tireMeshSize.x / 2;
const tireWidth = tireMeshSize.z;

scene.add( carBodyMesh, tireFrontLeftMesh, tireFrontRightMesh, tireRearLeftMesh, tireRearRightMesh );

const chassisRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
const chassisRigidBody = world.createRigidBody(chassisRigidBodyDesc);
chassisRigidBody.setTranslation( new THREE.Vector3( 0, 4, 0 ), true );
// chassisRigidBody.setRotation( new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 ), true );
const halfExtents = [ carBodyMeshSize.x / 2, carBodyMeshSize.y / 2, carBodyMeshSize.z / 2 ] as const;
const chassisColliderDesc = RAPIER.ColliderDesc.cuboid( ...halfExtents ).setMass( 150 );
const chassisCollider = world.createCollider( chassisColliderDesc, chassisRigidBody );

const chassisMesh = new THREE.Mesh(
	new THREE.BoxGeometry( halfExtents[ 0 ] * 2, halfExtents[ 1 ] * 2, halfExtents[ 2 ] * 2 ),
	new THREE.MeshBasicMaterial( { wireframe: true } )
);
chassisMesh.geometry.rotateX( Math.PI / 2 );
scene.add( chassisMesh );

const indexRightAxis = 2;
const indexForwardAxis = 0;
const indexUpAxis = 1;
const raycastVehicle = new RapierRaycastVehicle( {
	world,
	chassisRigidBody,
	indexRightAxis,
	indexForwardAxis,
	indexUpAxis,
} );

const commonWheelOptions = {
	radius: tireRadius,

	directionLocal: new THREE.Vector3( 0, - 1, 0 ),
	axleLocal: new THREE.Vector3( 0, 0, 1 ),

	suspensionStiffness: 30,
	suspensionRestLength: 0.3,
	maxSuspensionForce: 100000,
	maxSuspensionTravel: 0.3,

	sideFrictionStiffness: 1,
	frictionSlip: 1.4,
	dampingRelaxation: 2.3,
	dampingCompression: 4.4,

	rollInfluence: 0.01,

	customSlidingRotationalSpeed: -30,
	useCustomSlidingRotationalSpeed: true,

	forwardAcceleration: 1,
	sideAcceleration: 1,
};

const vehicleWidth = carBodyMeshSize.z;
const vehicleHeight = -0.38;
const vehicleFront = .7;
const vehicleRear =  -.9;

const wheelParams = [
	{
		// topLeft,
		...commonWheelOptions,
		chassisConnectionPointLocal: new THREE.Vector3(vehicleFront, vehicleHeight, vehicleWidth * 0.5 - tireWidth),
	},
	{
		// topRight,
		...commonWheelOptions,
		chassisConnectionPointLocal: new THREE.Vector3(vehicleFront, vehicleHeight, vehicleWidth * -0.5 + tireWidth),
	},
	{
		// bottomLeft,
		...commonWheelOptions,
		chassisConnectionPointLocal: new THREE.Vector3(vehicleRear, vehicleHeight, vehicleWidth * 0.5 - tireWidth),
	},
	{
		// bottomRight,
		...commonWheelOptions,
		chassisConnectionPointLocal: new THREE.Vector3(vehicleRear, vehicleHeight, vehicleWidth * -0.5 + tireWidth),
	},
];

for ( let i = 0; i < wheelParams.length; i ++ ) {

	const options = wheelParams[ i ];
	raycastVehicle.addWheel( options );

}



const wheelWidth = tireWidth;
const carWheelFrontRightMesh = new THREE.Mesh(
	new THREE.CylinderGeometry( commonWheelOptions.radius, commonWheelOptions.radius, wheelWidth, 16 ),
	new THREE.MeshBasicMaterial( { wireframe: true } )
);
carWheelFrontRightMesh.geometry.rotateX( Math.PI / 2 );
const carWheelFrontLeftMesh = carWheelFrontRightMesh.clone();
const carWheelRearRightMesh = carWheelFrontRightMesh.clone();
const carWheelRearLeftMesh = carWheelFrontRightMesh.clone();
scene.add( carWheelFrontRightMesh, carWheelFrontLeftMesh, carWheelRearRightMesh, carWheelRearLeftMesh );

const keyConfig = {
	forward: [ 'KeyW', 'ArrowUp' ],
	backward: [ 'KeyS', 'ArrowDown' ],
	left: [ 'KeyA', 'ArrowLeft' ],
	right: [ 'KeyD', 'ArrowRight' ],
	brake: [ 'Space' ],
};

const controls = {
	backward: false,
	forward: false,
	left: false,
	right: false,
	brake: false,
}

window.addEventListener( 'keydown', ( event ) => {

	if ( keyConfig.forward.includes( event.code ) ) controls.forward = true;
	if ( keyConfig.backward.includes( event.code ) ) controls.backward = true;
	if ( keyConfig.left.includes( event.code ) ) controls.left = true;
	if ( keyConfig.right.includes( event.code ) ) controls.right = true;
	if ( keyConfig.brake.includes( event.code ) ) controls.brake = true;

} );

window.addEventListener( 'keyup', ( event ) => {

	if ( keyConfig.forward.includes( event.code ) ) controls.forward = false;
	if ( keyConfig.backward.includes( event.code ) ) controls.backward = false;
	if ( keyConfig.left.includes( event.code ) ) controls.left = false;
	if ( keyConfig.right.includes( event.code ) ) controls.right = false;
	if ( keyConfig.brake.includes( event.code ) ) controls.brake = false;

} );


const maxForce = 80;
const maxSteer = 10;
const maxBrake = 80;

const updateKeyInput = ( vehicle: RapierRaycastVehicle ) => {

	// update wheels from controls
	let engineForce = 0
	let steering = 0

	if ( controls.forward ) engineForce += maxForce;
	if ( controls.backward ) engineForce -= maxForce;
	if ( controls.left ) steering += maxSteer;
	if ( controls.right ) steering -= maxSteer;

	const brakeForce = controls.brake ? maxBrake : 0;

	for ( let i = 0; i < vehicle.wheels.length; i ++ ) {

		vehicle.setBrakeValue( brakeForce, i );

	}

	// steer front wheels
	vehicle.setSteeringValue( steering, 0 );
	vehicle.setSteeringValue( steering, 1 );

	// apply engine force to back wheels
	vehicle.applyEngineForce( engineForce, 2 );
	vehicle.applyEngineForce( engineForce, 3 );

};



const cameraIdealOffset = new THREE.Vector3();
const cameraIdealLookAt = new THREE.Vector3();
const currentCameraPosition = new THREE.Vector3();
const currentCameraLookAt = new THREE.Vector3();
const chassisRotation = new THREE.Quaternion();
const chassisTranslation = new THREE.Vector3();
const updateCamera = ( delta: number ) => {

	const chassis = raycastVehicle.chassisRigidBody

	chassisRotation.copy( chassis.rotation() as THREE.Quaternion );
	chassisTranslation.copy( chassis.translation() as THREE.Vector3 );

	const t = 1.0 - Math.pow( 0.01, delta );

	cameraIdealOffset.set( - 4.5, .5, 0 );
	cameraIdealOffset.applyQuaternion( chassisRotation );
	cameraIdealOffset.add( chassisTranslation );

	if ( cameraIdealOffset.y < 0 ) cameraIdealOffset.y = 0.5;

	cameraIdealLookAt.set( 0, 1, 0 );
	cameraIdealLookAt.applyQuaternion( chassisRotation );
	cameraIdealLookAt.add( chassisTranslation );

	currentCameraPosition.lerp( cameraIdealOffset, t );
	currentCameraLookAt.lerp( cameraIdealLookAt, t );

	camera.position.copy( currentCameraPosition );
	camera.lookAt( currentCameraLookAt );

}

// @ts-ignore
// debug: expose for console checking
window.vehicle = raycastVehicle;


( function gameLoop() {

	if ( ! state.running ) return;

	const delta = 0.016;

	setTimeout( gameLoop, delta * 1000 );

	updateKeyInput( raycastVehicle );
	raycastVehicle.update( delta );
	world.step();

	const chassisRigidBodyRotation = raycastVehicle.chassisRigidBody.rotation();
	const chassisRigidBodyPosition = raycastVehicle.chassisRigidBody.translation();
	chassisMesh.quaternion.set( chassisRigidBodyRotation.x, chassisRigidBodyRotation.y, chassisRigidBodyRotation.z, chassisRigidBodyRotation.w );
	chassisMesh.position.set( chassisRigidBodyPosition.x, chassisRigidBodyPosition.y, chassisRigidBodyPosition.z );

	carWheelFrontRightMesh.quaternion.copy( raycastVehicle.wheels[0].state.worldTransform.quaternion );
	carWheelFrontRightMesh.position.copy( raycastVehicle.wheels[0].state.worldTransform.position );
	carWheelFrontLeftMesh.quaternion.copy( raycastVehicle.wheels[1].state.worldTransform.quaternion );
	carWheelFrontLeftMesh.position.copy( raycastVehicle.wheels[1].state.worldTransform.position );
	carWheelRearRightMesh.quaternion.copy( raycastVehicle.wheels[2].state.worldTransform.quaternion );
	carWheelRearRightMesh.position.copy( raycastVehicle.wheels[2].state.worldTransform.position );
	carWheelRearLeftMesh.quaternion.copy( raycastVehicle.wheels[3].state.worldTransform.quaternion );
	carWheelRearLeftMesh.position.copy( raycastVehicle.wheels[3].state.worldTransform.position );

	carBodyMesh.quaternion.set( chassisRigidBodyRotation.x, chassisRigidBodyRotation.y, chassisRigidBodyRotation.z, chassisRigidBodyRotation.w );
	carBodyMesh.position.set( chassisRigidBodyPosition.x, chassisRigidBodyPosition.y, chassisRigidBodyPosition.z );

	tireFrontLeftMesh.quaternion.copy( raycastVehicle.wheels[0].state.worldTransform.quaternion );
	tireFrontLeftMesh.position.copy( raycastVehicle.wheels[0].state.worldTransform.position );
	tireFrontRightMesh.quaternion.copy( raycastVehicle.wheels[1].state.worldTransform.quaternion );
	tireFrontRightMesh.position.copy( raycastVehicle.wheels[1].state.worldTransform.position );
	tireRearLeftMesh.quaternion.copy( raycastVehicle.wheels[2].state.worldTransform.quaternion );
	tireRearLeftMesh.position.copy( raycastVehicle.wheels[2].state.worldTransform.position );
	tireRearRightMesh.quaternion.copy( raycastVehicle.wheels[3].state.worldTransform.quaternion );
	tireRearRightMesh.position.copy( raycastVehicle.wheels[3].state.worldTransform.position );

	updateCamera( delta );

} )();

( function renderLoop () {

	const delta = clock.getDelta();
	const elapsed = clock.getElapsedTime();
	// const hasControlsUpdated = cameraControls.update( delta );

	if ( elapsed > 60 ) state.running = false;

	requestAnimationFrame( renderLoop );
	renderer.render( scene, camera );

} )();
