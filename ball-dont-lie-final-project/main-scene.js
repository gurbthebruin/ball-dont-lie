import { tiny, defs } from "./resources.js";

const {
  Vector,
  Matrix,
  Mat4,
  Color,
  Light,
  Shape,
  Shader,
  Material,
  Texture,
  Scene,
  Canvas_Widget,
  Code_Widget,
  Text_Widget
} = tiny;
const {
  Cube,
  Subdivision_Sphere,
  Transforms_Sandbox_Base,
  Rounded_Closed_Cone,
  Capped_Cylinder,
  Text_Line,
  Shape_From_File,
  Square
} = defs;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

const Body = (defs.Body = class Body {
  constructor(shape, material, size) {
    Object.assign(this, { shape, material, size });
  }
  emplace(
      location_matrix,
      linear_velocity,
      angular_velocity,
      spin_axis = Vector.of(0, 0, 0)
          .randomized(1)
          .normalized()
  ) {
    this.center = location_matrix.times(Vector.of(0, 0, 0, 1)).to3();
    this.rotation = Mat4.translation(this.center.times(-1)).times(
        location_matrix
    );
    this.previous = {
      center: this.center.copy(),
      rotation: this.rotation.copy()
    };
    this.drawn_location = location_matrix;
    return Object.assign(this, {
      linear_velocity,
      angular_velocity,
      spin_axis
    });
  }
  advance(time_amount) {
    this.previous = {
      center: this.center.copy(),
      rotation: this.rotation.copy()
    };
    this.center = this.center.plus(this.linear_velocity.times(time_amount));
    this.rotation.pre_multiply(
        Mat4.rotation(time_amount * this.angular_velocity, this.spin_axis)
    );
  }
  blend_rotation(alpha) {

    return this.rotation.map((x, i) =>
        Vector.from(this.previous.rotation[i]).mix(x, alpha)
    );
  }
  blend_state(alpha) {
    this.drawn_location = Mat4.translation(
        this.previous.center.mix(this.center, alpha)
    )
        .times(this.blend_rotation(alpha))
        .times(Mat4.scale(this.size));
  }
  static intersect_cube(p, margin = 0) {
    return p.every(value => value >= -1 - margin && value <= 1 + margin);
  }
  static intersect_sphere(p, margin = 0) {
    return p.dot(p) < 1 + margin;
  }
  check_if_colliding(b, collider) {
    if (this == b) return false; // Nothing collides with itself.
    var T = this.inverse.times(b.drawn_location);

    const { intersect_test, points, leeway } = collider;
    return points.arrays.position.some(p =>
        intersect_test(T.times(p.to4(1)).to3(), leeway)
    );
  }
});

class Final_Project extends Scene {
  constructor() {
    super();
    Object.assign(this, {
      time_accumulator: 0,
      time_scale: 1,
      t: 0,
      dt: 1 / 20,
      bodies: [],
      steps_taken: 0,
      title_balls: []
    });
    this.collider = {
      intersect_test: Body.intersect_sphere,
      points: new defs.Subdivision_Sphere(2),
      leeway: 0.7
    };

    this.sounds = {
      homerun: new Audio("assets/cheering.mp3"),
      booing: new Audio("assets/boo.mp3"),
      booing2: new Audio("assets/Boo-sound.mp3"),
      standby: new Audio("assets/standby.mp3"),
      you_win: new Audio ("assets/champion.mp3")
    };

    this.shapes = {
      box: new Cube(),
      ball_4: new Subdivision_Sphere(4),
      ball_6: new Subdivision_Sphere(6),
      grass: new Shape_From_File("assets/grass.obj"),
      text: new Text_Line(30),
      long_text: new Text_Line(100),
      bat: new Shape_From_File("assets/bat.obj"),
      rounded_cone: new Rounded_Closed_Cone(4, 10, [[0, 1], [0, 1]]),
      cylinder: new Capped_Cylinder(10, 10, [[0, 2], [0, 1]]),
      plane: new Square(),
      tree_stem: new Shape_From_File("assets/treestem.obj"),
      tree_leaves: new Shape_From_File("assets/treeleaves.obj"),
    };

    const phong_shader = new defs.Phong_Shader(2);
    const texture_shader = new defs.Textured_Phong(2);
    const texture_shader_2 = new defs.Fake_Bump_Map(10);
    const texture = new defs.Textured_Phong(1);
    const phong = new defs.Phong_Shader(1);
    const bump = new defs.Fake_Bump_Map(1);

    this.materials = {
      text_image: new Material(texture, {
        texture: new Texture("assets/text.png"),
        ambient: 1,
        diffusivity: 0,
        specularity: 0
      }),
      baseball: new Material(texture_shader_2, {
        texture: new Texture("assets/baseball.jpg"),
        ambient: 1,
        diffusivity: 1,
        specularity: 0
      }),
      basketball: new Material(texture_shader_2, {
        texture: new Texture("assets/basketball3.jpeg"),
        ambient: 1,
        diffusivity: 1,
        specularity: 0
      }),
      aluminum: new Material(texture_shader_2, {
        texture: new Texture("assets/aluminum.jpg"),
        ambient: 0.5,
        diffusivity: 1,
        specularity: 0.75
      }),
      grass: new Material(texture_shader_2, {
        ambient: 0.15,
        diffusivity: 1,
        specularity: 0,
        color: Color.of(0.333333, 0.419608, 0.184314, 1)
      }),
      wood: new Material(texture_shader_2, {
        texture: new Texture("assets/wood.jpeg"),
        ambient: 0.5,
        diffusivity: 1,
        specularity: 0
      }),
      fence: new Material(texture_shader_2, {
        texture: new Texture("assets/fencer.jpeg"),
        ambient: 0.5,
        diffusivity: 1,
        specularity: 0
      }),
      base: new Material(texture_shader, {
        texture: new Texture("assets/leather.jpg"),
        ambient: 0.5,
        diffusivity: 1,
        specularity: 0.1,
        color: Color.of(0.5, 0.5, 0.5, 1)
      }),
      field: new Material(texture_shader_2, {
        texture: new Texture("assets/grass.jpeg"),
        ambient: 0.6,
        diffusivity: 1,
        specularity: 0
      }),
      dirt: new Material(texture_shader_2, {
        texture: new Texture("assets/dirt_road.jpeg"),
        ambient: 0.8,
        diffusivity: 1,
        specularity: 0
      }),
      sky: new Material(texture_shader_2, {
        texture: new Texture("assets/sunny.jpeg"),
        ambient: 0.75,
        diffusivity: 0,
        specularity: 0
      }),
      nighttime: new Material(texture_shader_2, {
        texture: new Texture("assets/night_timer.jpeg"),
        ambient: 1,
        diffusivity: 0,
        specularity: 0
      }),
      skin_color: new Material(phong_shader, {
        ambient: 0.5,
        diffusivity: 0,
        specularity: 0,
        color: Color.of(1, 0.937255, 0.835294, 1)
      }),
      asish: new Material(texture_shader_2, {
        texture: new Texture("assets/asish_law2.png"),
        ambient: 0.8,
        diffusivity: 0,
        specularity: 0
      }),
      bear_color: new Material(texture_shader_2, {
        texture: new Texture("assets/wood.jpeg"),
        ambient: 0.5,
        diffusivity: 0.8,
        specularity: 0.1,
        color: Color.of(0.4, 0.15, 0.05, 1)
      }),
      clothing: new Material(phong_shader, {
        ambient: 0.5,
        diffusivity: 0.5,
        specularity: 1,
        color: Color.of(0, 0.8, 1, 1)
      }),
      dark: new Material(phong_shader, {
        ambient: 0.5,
        diffusivity: 1,
        specularity: 0,
        color: Color.of(0, 0, 0, 1)
      }),
      leaf: new Material(phong_shader, {
        ambient: 0.5,
        diffusivity: 0,
        specularity: 0,
        color: Color.of(0.419608, 0.556863, 0.137255, 1)
      })
    };

    this.stateOfGame = {
      beforeStart: "NOT STARTED",
      started: "STARTED",
      gameOver: "GAME OVER",
      gameWon: "YOU WIN"
    };

    this.gameLevel = {
      one: "1"
    };

    this.nightTime = false;

    this.currentState = this.stateOfGame.beforeStart;

    this.currentLevel = this.gameLevel.one;

    this.currentScore = 0;

    this.gameTarget = 3;

    this.gameBegan = 0;

    this.gameEnded = 0;


    this.threwPitch = false;
    this.pitchCounter = 20;
    this.pitchVelocity = 50;
    this.basket_or_base = 0;
    this.pitchCoord = -2;
    this.pitchTimer = 0;
    this.battingX = -4;
    this.swingToggler = false;
    this.batSwinger = false;
    this.swingTimer = 0;
    this.batCollisionDetection = false;
    this.ballBounceDetection = false;

    this.homeRun = false;
    this.pitch_time = false;
    this.pitch_timer = 0;
  }
  simulate(frame_time) {
    frame_time = this.time_scale * frame_time;

    this.time_accumulator += Math.min(frame_time, 0.1);
    while (Math.abs(this.time_accumulator) >= this.dt) {
      this.update_state(this.dt);
      for (let b of this.bodies) b.advance(this.dt);
      this.t += Math.sign(frame_time) * this.dt;
      this.time_accumulator -= Math.sign(frame_time) * this.dt;
      this.steps_taken++;
    }
    let alpha = this.time_accumulator / this.dt;
    for (let b of this.bodies) b.blend_state(alpha);
  }

  make_control_panel() {
    this.key_triggered_button("Begin Game", ["m"], () => {
      this.currentState = this.stateOfGame.started;
    });
    this.key_triggered_button("Restart Game", ["r"], () => {
      this.currentState = this.stateOfGame.started;
      this.currentLevel = 1;
      this.gameTarget = 3;
      this.currentScore = 0;
      this.pitchCounter = 20;
      this.gameBegan = 0;
    });
    this.key_triggered_button("Change day/night time", ["n"], () => {
      if (this.nightTime == true) {
        this.nightTime = false;
      } else {
        this.nightTime = true;
      }
    });
    this.key_triggered_button("Move Left", ["j"], () => {
      this.battingX = Math.max(this.battingX - 0.5, -6);
    });
    this.key_triggered_button("Move Right", ["l"], () => {
      this.battingX = Math.min(this.battingX + 0.5, -2);
    });
    this.key_triggered_button("Swing", ["v"], () => {
      if (!this.batSwinger) this.swingToggler = true;
    });
    this.key_triggered_button("Home Run", ["8"], () => {
      this.batCollisionDetection = true;
    });
  }


  display(context, program_state) {

    if (!context.scratchpad.controls) {
      /*
       this.children.push(
         (context.scratchpad.controls = new defs.Movement_Controls())
       );
      */


      this.children.push(
          (context.scratchpad.controls = new defs.Program_State_Viewer())
      );


      this.children.push((this.camera_teleporter = new Camera_Teleporter()));



      program_state.set_camera(
          Mat4.inverse(Mat4.identity().times(Mat4.translation([0, 500, 0])))
      );

      this.initial_camera_location = program_state.camera_inverse;
      program_state.projection_transform = Mat4.perspective(
          Math.PI / 4,
          context.width / context.height,
          1,
          500
      );
    }

    if (
        this.currentState == this.stateOfGame.started &&
        this.gameBegan == 0
    ) {
      program_state.set_camera(
          Mat4.inverse(
              Mat4.identity()
                  .times(Mat4.translation([0, 0, 13]))
                  .times(Mat4.rotation(-0.35, Vector.of(1, 0, 0)))
                  .times(Mat4.translation([0, -1.5, 0]))
                  .times(Mat4.scale([1.3, 1.5, 1.1]))
          )
      );
      this.initial_camera_location = program_state.camera_inverse;
      program_state.projection_transform = Mat4.perspective(
          Math.PI / 4,
          context.width / context.height,
          1,
          2500
      );
      this.gameBegan++;
    }

    const t = program_state.animation_time / 1000;

    this.camera_teleporter.cameras = [];
    this.camera_teleporter.cameras.push(
        Mat4.inverse(
            Mat4.identity()
                .times(Mat4.translation([0, 0, 13]))
                .times(Mat4.rotation(-0.35, Vector.of(1, 0, 0)))
                .times(Mat4.translation([0, -1.5, 0]))
                .times(Mat4.scale([1.3, 1.5, 1.1]))
        )
    );

    let model_transform = Mat4.identity()
        .times(Mat4.translation([0, 0, 0]))
        .times(Mat4.rotation(-Math.PI / 4, [0, 1, 0]))
        .times(Mat4.translation([20, 0, 20]));

    program_state.lights = [
      new Light(Vector.of(0, 0, 0, 1), Color.of(1, 1, 1, 1), 100000)
    ];

    const lights_on = this.nightTime ? { ambient: 1.0 } : { ambient: 0.0 };

    if (this.currentState == this.stateOfGame.beforeStart) {
      this.sounds.standby.play();
      let title_backdrop = Mat4.identity();

      title_backdrop = title_backdrop
          .times(Mat4.translation([0, 500, 0]))
          .times(Mat4.scale([50, 50, 50]));
      this.shapes.box.draw(
          context,
          program_state,
          title_backdrop,
          this.materials.sky
      );

      let title_text = Mat4.identity();

      title_text = title_text.times(Mat4.translation([-15, 510, -40]));

      this.shapes.text.set_string("    Ball Don't Lie!", context.context);
      this.shapes.text.draw(
          context,
          program_state,
          title_text,
          this.materials.text_image
      );

      title_text = title_text.times(Mat4.translation([4, -20, 0]));

      this.shapes.text.set_string("Press M to start.", context.context);
      this.shapes.text.draw(
          context,
          program_state,
          title_text,
          this.materials.text_image
      );

      title_text = title_text
          .times(Mat4.translation([-17, -2, 0]))
          .times(Mat4.scale([0.5, 0.5, 0.5]));

      this.shapes.long_text.set_string(
          "Rules: Win by hitting 3 home-runs (Swing with v) and DONT HIT THE BASKETBALLS",
          context.context
      );
      this.shapes.long_text.draw(
          context,
          program_state,
          title_text,
          this.materials.text_image
      );

      let mainBear = Mat4.identity();

      mainBear = mainBear
          .times(Mat4.translation([0, 501.5, -15]))
          .times(Mat4.rotation(3.14, Vector.of(0, 1, 0)));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBear,
          this.materials.bear_color
      );

      let mainBearEyes = mainBear.copy();

      mainBearEyes = mainBearEyes
          .times(Mat4.translation([0.5, 0.25, -1]))
          .times(Mat4.scale([0.05, 0.05, 0.05]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearEyes,
          this.materials.dark
      );

      mainBearEyes = mainBearEyes
          .times(Mat4.scale([1 / 0.05, 1 / 0.05, 1 / 0.05]))
          .times(Mat4.translation([-1, 0, 0]))
          .times(Mat4.scale([0.05, 0.05, 0.05]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearEyes,
          this.materials.dark
      );

      let mainBearBody = mainBear
          .times(Mat4.translation([0, -1.5, 0]))
          .times(Mat4.scale([1.3, 1.5, 1.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearBody,
          this.materials.clothing
      );

      let mainBearLeftEar = mainBear
          .times(Mat4.translation([-0.8, 0.8, 0]))
          .times(Mat4.scale([0.25, 0.25, 0.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearLeftEar,
          this.materials.bear_color
      );

      let mainBearRightEar = mainBear
          .times(Mat4.translation([0.8, 0.8, 0]))
          .times(Mat4.scale([0.25, 0.25, 0.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearRightEar,
          this.materials.bear_color
      );

      let mainBearRightArm = mainBear.copy();

      mainBearRightArm = mainBearRightArm
          .times(Mat4.translation([1.1, -0.5, -1.1]))
          .times(Mat4.rotation(181, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(1, Vector.of(0, 0, 1)))
          .times(Mat4.rotation(-0.5, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.4, 1.3, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearRightArm,
          this.materials.bear_color
      );

      let mainBearLeftArm = mainBear.copy();

      mainBearLeftArm = mainBearLeftArm
          .times(Mat4.translation([-1, -0.5, -1.1]))
          .times(Mat4.rotation(-180, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(-1.1, Vector.of(0, 0, 1)))
          .times(Mat4.rotation(0.5, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.4, 1.3, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearLeftArm,
          this.materials.bear_color
      );

      let mainBearLeftLeg = mainBear
          .times(Mat4.translation([-0.7, -3, 0]))
          .times(Mat4.scale([0.4, 1, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearLeftLeg,
          this.materials.bear_color
      );

      let mainBearRightLeg = mainBear
          .times(Mat4.translation([0.7, -3, 0]))
          .times(Mat4.scale([0.4, 1, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearRightLeg,
          this.materials.bear_color
      );

      let mainBearNose = mainBear
          .times(Mat4.translation([0.05, 0.1, -1.2]))
          .times(Mat4.rotation(3, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(-0.2, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.5, 0.5, 0.45]));

      this.shapes.rounded_cone.draw(
          context,
          program_state,
          mainBearNose,
          this.materials.bear_color
      );

      let mainBearNoseTip = mainBear
          .times(Mat4.translation([0, 0, -1.5]))
          .times(Mat4.scale([0.15, 0.15, 0.15]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          mainBearNoseTip,
          this.materials.dark
      );

      let frameTimer = this.time_scale * program_state.animation_delta_time;

      this.time_accumulator += Math.min(frameTimer, 0.1);

      while (Math.abs(this.time_accumulator) >= this.dt) {
        while (this.title_balls.length < 15) {
          this.title_balls.push(
              new Body(
                  this.shapes.ball_4,
                  this.materials.baseball,
                  Vector.of(1, 1 + Math.random(), 1)
              ).emplace(
                  Mat4.translation(Vector.of(0, 530, -20).randomized(10)),
                  Vector.of(0, -1, 0)
                      .randomized(2)
                      .normalized()
                      .times(3),
                  Math.random()
              )
          );
        }

        for (let b of this.title_balls) {
          b.linear_velocity[1] += (1 / 20) * -9.8;
          if (b.center[1] < 480 && b.linear_velocity[1] < 0)
            b.linear_velocity[1] *= -0.8;
        }

        this.title_balls = this.title_balls.filter(
            b => b.center.norm() < 530 && b.linear_velocity.norm() > 2
        );
        for (let b of this.title_balls) b.advance(this.dt);
        this.t += Math.sign(frameTimer) * this.dt;
        this.time_accumulator -= Math.sign(frameTimer) * this.dt;
        this.steps_taken++;
      }
      let alpha = this.time_accumulator / this.dt;
      for (let b of this.title_balls) b.blend_state(alpha);
      for (let b of this.title_balls)
        b.shape.draw(context, program_state, b.drawn_location, b.material);
    }

    if (this.currentState == this.stateOfGame.gameOver) {
      this.sounds.standby.play();
      program_state.set_camera(
          Mat4.inverse(Mat4.identity().times(Mat4.translation([0, 500, 0])))
      );

      this.initial_camera_location = program_state.camera_inverse;
      program_state.projection_transform = Mat4.perspective(
          Math.PI / 4,
          context.width / context.height,
          1,
          500
      );

      let titleDrop = Mat4.identity();

      titleDrop = titleDrop
          .times(Mat4.translation([0, 500, 0]))
          .times(Mat4.scale([50, 50, 50]));
      this.shapes.box.draw(
          context,
          program_state,
          titleDrop,
          this.materials.nighttime
      );

      let mainTitle = Mat4.identity();

      mainTitle = mainTitle.times(Mat4.translation([-6, 510, -40]));

      this.shapes.text.set_string("You Suck!", context.context);
      this.shapes.text.draw(
          context,
          program_state,
          mainTitle,
          this.materials.text_image
      );

      mainTitle = mainTitle.times(Mat4.translation([-7, -20, 0]));

      this.shapes.text.set_string("Click r to play again.", context.context);
      this.shapes.text.draw(
          context,
          program_state,
          mainTitle,
          this.materials.text_image
      );

      let titleBear = Mat4.identity();

      titleBear = titleBear
          .times(Mat4.translation([0, 501.5, -15]))
          .times(Mat4.rotation(3.14, Vector.of(0, 1, 0)));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBear,
          this.materials.bear_color
      );

      let titleBearEyes = titleBear.copy();

      titleBearEyes = titleBearEyes
          .times(Mat4.translation([0.5, 0.25, -1]))
          .times(Mat4.scale([0.05, 0.05, 0.05]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearEyes,
          this.materials.dark
      );

      titleBearEyes = titleBearEyes
          .times(Mat4.scale([1 / 0.05, 1 / 0.05, 1 / 0.05]))
          .times(Mat4.translation([-1, 0, 0]))
          .times(Mat4.scale([0.05, 0.05, 0.05]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearEyes,
          this.materials.dark
      );

      let titleBearBody = titleBear
          .times(Mat4.translation([0, -1.5, 0]))
          .times(Mat4.scale([1.3, 1.5, 1.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearBody,
          this.materials.clothing
      );

      let titleBearLeftEar = titleBear
          .times(Mat4.translation([-0.8, 0.8, 0]))
          .times(Mat4.scale([0.25, 0.25, 0.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearLeftEar,
          this.materials.bear_color
      );

      let titleBearRightEar = titleBear
          .times(Mat4.translation([0.8, 0.8, 0]))
          .times(Mat4.scale([0.25, 0.25, 0.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearRightEar,
          this.materials.bear_color
      );

      let titleBearRightArm = titleBear.copy();

      titleBearRightArm = titleBearRightArm
          .times(Mat4.translation([1.1, -1.1, -1.1]))
          .times(Mat4.scale([0.4, 0.7, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearRightArm,
          this.materials.bear_color
      );

      let titleBearLeftArm = titleBear.copy();

      titleBearLeftArm = titleBearLeftArm
          .times(Mat4.translation([-1, -1.1, -1.1]))
          .times(Mat4.rotation(-180, Vector.of(0, 1, 0)))
          .times(Mat4.scale([0.4, 0.7, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearLeftArm,
          this.materials.bear_color
      );

      let titleBearLeftLeg = titleBear
          .times(Mat4.translation([-0.7, -3, 0]))
          .times(Mat4.scale([0.4, 1, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearLeftLeg,
          this.materials.bear_color
      );

      let titleBearRightLeg = titleBear
          .times(Mat4.translation([0.7, -3, 0]))
          .times(Mat4.scale([0.4, 1, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearRightLeg,
          this.materials.bear_color
      );

      let titleBearNose = titleBear
          .times(Mat4.translation([0.05, 0.1, -1.2]))
          .times(Mat4.rotation(3, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(-0.2, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.5, 0.5, 0.45]));

      this.shapes.rounded_cone.draw(
          context,
          program_state,
          titleBearNose,
          this.materials.bear_color
      );

      let titleBearNoseTip = titleBear
          .times(Mat4.translation([0, 0, -1.5]))
          .times(Mat4.scale([0.15, 0.15, 0.15]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBearNoseTip,
          this.materials.dark
      );
    }

    if (this.currentState == this.stateOfGame.gameWon) {
      this.sounds.you_win.play();
      program_state.set_camera(
          Mat4.inverse(Mat4.identity().times(Mat4.translation([0, 500, 0])))
      );

      this.initial_camera_location = program_state.camera_inverse;
      program_state.projection_transform = Mat4.perspective(
          Math.PI / 4,
          context.width / context.height,
          1,
          500
      );
      let titleDrop = Mat4.identity();

      titleDrop = titleDrop
          .times(Mat4.translation([0, 500, 0]))
          .times(Mat4.scale([50, 50, 50]));
      this.shapes.box.draw(
          context,
          program_state,
          titleDrop,
          this.materials.sky
      );

      let titleTxr = Mat4.identity();

      titleTxr = titleTxr.times(Mat4.translation([-5, 510, -40]));

      this.shapes.text.set_string("You won!", context.context);
      this.shapes.text.draw(
          context,
          program_state,
          titleTxr,
          this.materials.text_image
      );

      titleTxr = titleTxr.times(Mat4.translation([-6, -20, 0]));

      this.shapes.text.set_string("Press R to restart.", context.context);
      this.shapes.text.draw(
          context,
          program_state,
          titleTxr,
          this.materials.text_image
      );

      let titleBear = Mat4.identity();

      titleBear = titleBear
          .times(Mat4.translation([0, 501.5, -15]))
          .times(Mat4.rotation(3.14, Vector.of(0, 1, 0)));

      this.shapes.ball_6.draw(
          context,
          program_state,
          titleBear,
          this.materials.bear_color
      );

      let bearEyes = titleBear.copy();

      bearEyes = bearEyes
          .times(Mat4.translation([0.5, 0.25, -1]))
          .times(Mat4.scale([0.05, 0.05, 0.05]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearEyes,
          this.materials.dark
      );

      bearEyes = bearEyes
          .times(Mat4.scale([1 / 0.05, 1 / 0.05, 1 / 0.05]))
          .times(Mat4.translation([-1, 0, 0]))
          .times(Mat4.scale([0.05, 0.05, 0.05]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearEyes,
          this.materials.dark
      );

      let bearBody = titleBear
          .times(Mat4.translation([0, -1.5, 0]))
          .times(Mat4.scale([1.3, 1.5, 1.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearBody,
          this.materials.clothing
      );

      let bearLeftEar = titleBear
          .times(Mat4.translation([-0.8, 0.8, 0]))
          .times(Mat4.scale([0.25, 0.25, 0.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearLeftEar,
          this.materials.bear_color
      );

      let bearRightEar = titleBear
          .times(Mat4.translation([0.8, 0.8, 0]))
          .times(Mat4.scale([0.25, 0.25, 0.1]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearRightEar,
          this.materials.bear_color
      );

      let bearRightArm = titleBear.copy();

      bearRightArm = bearRightArm
          .times(Mat4.translation([1.1, -0.5, -1.1]))
          .times(Mat4.rotation(181, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(1, Vector.of(0, 0, 1)))
          .times(Mat4.rotation(-0.5, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.4, 1.3, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearRightArm,
          this.materials.bear_color
      );

      let bearLeftArm = titleBear.copy();

      bearLeftArm = bearLeftArm
          .times(Mat4.translation([-1, -0.5, -1.1]))
          .times(Mat4.rotation(-180, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(-1.1, Vector.of(0, 0, 1)))
          .times(Mat4.rotation(0.5, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.4, 1.3, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearLeftArm,
          this.materials.bear_color
      );

      let bearLeftLeg = titleBear
          .times(Mat4.translation([-0.7, -3, 0]))
          .times(Mat4.scale([0.4, 1, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearLeftLeg,
          this.materials.bear_color
      );

      let bearRightLeg = titleBear
          .times(Mat4.translation([0.7, -3, 0]))
          .times(Mat4.scale([0.4, 1, 0.4]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearRightLeg,
          this.materials.bear_color
      );

      let bearNose = titleBear
          .times(Mat4.translation([0.05, 0.1, -1.2]))
          .times(Mat4.rotation(3, Vector.of(0, 1, 0)))
          .times(Mat4.rotation(-0.2, Vector.of(1, 0, 0)))
          .times(Mat4.scale([0.5, 0.5, 0.45]));

      this.shapes.rounded_cone.draw(
          context,
          program_state,
          bearNose,
          this.materials.bear_color
      );

      let bearTip = titleBear
          .times(Mat4.translation([0, 0, -1.5]))
          .times(Mat4.scale([0.15, 0.15, 0.15]));

      this.shapes.ball_6.draw(
          context,
          program_state,
          bearTip,
          this.materials.dark
      );

      let frame_time = this.time_scale * program_state.animation_delta_time;

      this.time_accumulator += Math.min(frame_time, 0.1);

      while (Math.abs(this.time_accumulator) >= this.dt) {
        while (this.title_balls.length < 15) {
          this.title_balls.push(
            new Body(
              this.shapes.ball_4,
              this.materials.baseball,
              Vector.of(1, 1 + Math.random(), 1)
            ).emplace(
              Mat4.translation(Vector.of(0, 530, -20).randomized(10)),
              Vector.of(0, -1, 0)
                .randomized(2)
                .normalized()
                .times(3),
              Math.random()
            )
          );
        }

        for (let b of this.title_balls) {
          b.linear_velocity[1] += (1 / 20) * -9.8;
          if (b.center[1] < 480 && b.linear_velocity[1] < 0)
            b.linear_velocity[1] *= -0.8;
        }

        this.title_balls = this.title_balls.filter(
          b => b.center.norm() < 530 && b.linear_velocity.norm() > 2
        );
        for (let b of this.title_balls) b.advance(this.dt);
        this.t += Math.sign(frame_time) * this.dt;
        this.time_accumulator -= Math.sign(frame_time) * this.dt;
        this.steps_taken++;
      }
      let alpha = this.time_accumulator / this.dt;
      for (let b of this.title_balls) b.blend_state(alpha);
      for (let b of this.title_balls)
        b.shape.draw(context, program_state, b.drawn_location, b.material);
    }

    if (this.currentState == this.stateOfGame.started) {
      while (this.title_balls != 0) {
        for (let b of this.title_balls) this.title_balls.pop();
      }
      this.sounds.standby.pause();
      this.sounds.you_win.pause();

    }

    if (
      this.currentLevel == this.gameLevel.one &&
      this.currentScore < 3 &&
      this.pitchCounter == -1
    ) {
      this.currentState = this.stateOfGame.gameOver;
    }

    if (
      this.currentLevel == this.gameLevel.one &&
      this.currentScore >= 3 &&
      this.pitchCounter == -1
    ) {
      this.currentState = this.stateOfGame.gameWon;
    }

    let pitches = Mat4.identity();

    pitches = pitches
      .times(Mat4.translation([-5, -2, -10]))
      .times(Mat4.scale([0.5, 0.5, 0.5]))
      .times(Mat4.rotation(-0.1, [1, 0, 0]));
    const pitch_plural = " Pitches Left!";
    const pitch_singular = " Pitch Left!";
    if (this.pitchCounter == 1) {
      this.shapes.text.set_string(
        this.pitchCounter + pitch_singular,
        context.context
      );
    } else {
      if (this.pitchCounter == -1) this.shapes.text.set_string(
        "0" + pitch_plural,
        context.context)
      else this.shapes.text.set_string(
        this.pitchCounter + pitch_plural,
        context.context
      );
    }
    this.shapes.text.draw(
      context,
      program_state,
      pitches,
      this.materials.text_image
    );

    let level = Mat4.identity();

    level = level
      .times(Mat4.translation([5, -7, 5]))
      .times(Mat4.scale([0.25, 0.25, 0.25]))
      .times(Mat4.rotation(-0.4, [1, 0, 0]));

    this.shapes.text.set_string(
      "Scoreboard",
      context.context
    );
    this.shapes.text.draw(
      context,
      program_state,
      level,
      this.materials.text_image
    );

    let homeruns = Mat4.identity();

    homeruns = homeruns
      .times(Mat4.translation([6, -9, 5]))
      .times(Mat4.scale([0.25, 0.25, 0.25]))
      .times(Mat4.rotation(-0.4, [1, 0, 0]));

    this.shapes.text.set_string(
      "Score: " + this.currentScore,
      context.context
    );
    this.shapes.text.draw(
      context,
      program_state,
      homeruns,
      this.materials.text_image
    );

    let target = Mat4.identity();

    target = target
      .times(Mat4.translation([5.3, -8, 5]))
      .times(Mat4.scale([0.25, 0.25, 0.25]))
      .times(Mat4.rotation(-0.4, [1, 0, 0]));

    this.shapes.text.set_string("Target: " + this.gameTarget, context.context);

    this.shapes.text.draw(
      context,
      program_state,
      target,
      this.materials.text_image
    );


    let sky = model_transform.copy();

    sky = sky
      .times(Mat4.translation([-230, 164, -225]))
      .times(Mat4.scale([250, 175, 250]));
    if (this.nightTime == true) {
      this.shapes.box.draw(
        context,
        program_state,
        sky,
        this.materials.nighttime
      );
    } else {
      this.shapes.box.draw(context, program_state, sky, this.materials.sky);
    }

    let tree = Mat4.identity();

    tree = tree
      .times(Mat4.translation([-90, 21, -90]))
      .times(Mat4.scale([10, 10, 10]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([5, 0, -5]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([10, 0, -5]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([-15, 0, 5]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([9, 0, -4]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([7, 0, 7]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([5, 0, 1]));

    this.shapes.tree_stem.draw(
      context,
      program_state,
      tree,
      this.materials.wood
    );

    this.shapes.tree_leaves.draw(
      context,
      program_state,
      tree,
      this.materials.leaf
    );

    tree = tree.times(Mat4.translation([10, 0, 2]));

    this.shapes.tree_stem.draw(
        context,
        program_state,
        tree,
        this.materials.wood
    );

    this.shapes.tree_leaves.draw(
        context,
        program_state,
        tree,
        this.materials.leaf
    );

    let grass = Mat4.identity();

    grass = grass
      .times(Mat4.translation(Vector.of(-50, -3, -230)))
      .times(Mat4.scale([5, 5, 5]));

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 5; j++) {
        let grass_piece = grass.times(Mat4.translation([+i * 3, 0, +j * 4]));

        this.shapes.grass.draw(
          context,
          program_state,
          grass_piece,
          this.materials.grass
        );
      }
    }

    grass = grass
      .times(Mat4.rotation(0.785398, Vector.of(0, 1, 0)))
      .times(Mat4.translation(Vector.of(-30, 0, 1)));

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 5; j++) {
        let grass_piece = grass.times(Mat4.translation([+i * 3, 0, +j * 4]));

        this.shapes.grass.draw(
          context,
          program_state,
          grass_piece,
          this.materials.grass
        );
      }
    }

    grass = grass
      .times(Mat4.rotation(2 * 0.785398, Vector.of(0, 1, 0)))
      .times(Mat4.translation(Vector.of(-44, 0, 28)));

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 5; j++) {
        let grass_piece = grass.times(Mat4.translation([+i * 3, 0, +j * 4]));

        this.shapes.grass.draw(
          context,
          program_state,
          grass_piece,
          this.materials.grass
        );
      }
    }
    /******************** FIELD ********************/

    let field = model_transform
      .copy()
      .times(Mat4.rotation(1.5708, Vector.of(1, 0, 0)))
      .times(Mat4.translation([-430, -450, 35]))
      .times(Mat4.scale([25, 25, 25]))
      .times(Mat4.translation([-1, 0, -1]));

    for (let i = 0; i < 19; i++) {
      for (let j = 0; j < 19; j++) {
        let field_piece = field.times(Mat4.translation([+i, +j, 0]));

        if (this.nightTime) {
          this.shapes.plane.draw(
            context,
            program_state,
            field_piece,
            this.materials.field.override({ ambient: 0.4 })
          );
        } else {
          this.shapes.plane.draw(
            context,
            program_state,
            field_piece,
            this.materials.field
          );
        }
      }
    }

    /******************** FENCE ********************/

    let fence = model_transform.copy();

    fence = fence
      .times(Mat4.translation([-125, -7, -127]))
      .times(Mat4.scale([0.1, 3, 1]));

    for (let total = 1; total < 60; total++) {
      fence = fence.times(Mat4.translation([0, 0, 2.1]));

      this.shapes.box.draw(context, program_state, fence, this.materials.fence);
    }

    fence = model_transform.copy();

    fence = fence
      .times(Mat4.translation([-126, -7, -126]))
      .times(Mat4.scale([1, 3, 0.1]));

    for (let total = 1; total < 60; total++) {
      fence = fence.times(Mat4.translation([2.1, 0, 0]));

      this.shapes.box.draw(context, program_state, fence, this.materials.fence);
    }
    const dirt_mod = this.nightTime ? {ambient: 0.6} : {ambient: 0.8};

    let home_dirt = model_transform.copy();

    home_dirt = home_dirt
      .times(Mat4.scale([0.75, 0.5, 0.75]))
      .times(Mat4.translation([-25, -20, -25]))
      .times(Mat4.scale([6, 1, 6]));

    this.shapes.ball_4.draw(
      context,
      program_state,
      home_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    let home_base = home_dirt.copy();

    home_base = home_base
      .times(Mat4.translation([0, 0.5, 0]))
      .times(Mat4.scale([1 / 3, 1, 1 / 3]));

    this.shapes.box.draw(
      context,
      program_state,
      home_base,
      this.materials.base
    );

    let mound = home_dirt.copy();

    mound = mound
      .times(Mat4.translation([-4.5, 0, -4.5]))
      .times(Mat4.scale([1, 3, 1]));

    this.shapes.ball_4.draw(context, program_state, mound, this.materials.dirt.override(dirt_mod));

    let base1_dirt = home_dirt.copy();

    base1_dirt = base1_dirt.times(Mat4.translation([0, 0, -9]));

    this.shapes.ball_4.draw(
      context,
      program_state,
      base1_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    let base1 = base1_dirt.copy();

    base1 = base1
      .times(Mat4.translation([0, 0.5, 0]))
      .times(Mat4.scale([1 / 3, 1, 1 / 3]));

    this.shapes.box.draw(context, program_state, base1, this.materials.base);

    let base2_dirt = base1_dirt.copy();

    base2_dirt = base2_dirt.times(Mat4.translation([-9, 0, 0]));

    this.shapes.ball_4.draw(
      context,
      program_state,
      base2_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    let base2 = base2_dirt.copy();

    base2 = base2
      .times(Mat4.translation([0, 0.5, 0]))
      .times(Mat4.scale([1 / 3, 1, 1 / 3]));

    this.shapes.box.draw(context, program_state, base2, this.materials.base);

    let base3_dirt = base2_dirt.copy();

    base3_dirt = base3_dirt.times(Mat4.translation([0, 0, 9]));

    this.shapes.ball_4.draw(
      context,
      program_state,
      base3_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    let base3 = base3_dirt.copy();

    base3 = base3
      .times(Mat4.translation([0, 0.5, 0]))
      .times(Mat4.scale([1 / 3, 1, 1 / 3]));

    this.shapes.box.draw(context, program_state, base3, this.materials.base);

    let h1_dirt = home_dirt.copy();

    h1_dirt = h1_dirt
      .times(Mat4.translation([0, -0.9, -4]))
      .times(Mat4.scale([1 / 3, 1, 4.5]));

    this.shapes.box.draw(context, program_state, h1_dirt, this.materials.dirt.override(dirt_mod));

    let onetwo_dirt = base1_dirt.copy();

    onetwo_dirt = onetwo_dirt
      .times(Mat4.translation([-4, -0, 0]))
      .times(Mat4.scale([4.5, 1, 1 / 3]));

    this.shapes.box.draw(
      context,
      program_state,
      onetwo_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    let twothree_dirt = base2_dirt.copy();

    twothree_dirt = twothree_dirt
      .times(Mat4.translation([0, -0.9, 4]))
      .times(Mat4.scale([1 / 3, 1, 4.5]));

    this.shapes.box.draw(
      context,
      program_state,
      twothree_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    let threeh_dirt = home_dirt.copy();

    threeh_dirt = threeh_dirt
      .times(Mat4.translation([-4, -0.9, 0]))
      .times(Mat4.scale([4.5, 1, 1 / 3]));

    this.shapes.box.draw(
      context,
      program_state,
      threeh_dirt,
      this.materials.dirt.override(dirt_mod)
    );

    if (this.swingToggler) {
      this.swingTimer = t;
      this.batSwinger = true;
      this.swingToggler = false;
    }

    const swing_diff = t - this.swingTimer;

    let winnie_transform = Mat4.identity()
      .times(Mat4.translation([this.battingX, -6, 3]))
      .times(Mat4.rotation(-1, Vector.of(0, 1, 0)));

    if (this.batSwinger)
      winnie_transform = winnie_transform.times(
        Mat4.rotation(-0.1 - 1 * Math.cos(swing_diff * 8.1), Vector.of(0, 1, 0))
      );

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnie_transform,
      this.materials.bear_color
    );

    let winnieRightEye = winnie_transform
      .times(Mat4.translation([0.4, 0.65, -0.55]))
      .times(Mat4.scale([0.1, 0.1, 0.1]));

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieRightEye,
      this.materials.dark
    );

    let winnieLeftEye = winnie_transform
      .times(Mat4.translation([-0.4, 0.65, -0.55]))
      .times(Mat4.scale([0.1, 0.1, 0.1]));

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieLeftEye,
      this.materials.dark
    );

    let winnie_body = winnie_transform
      .times(Mat4.translation([0, -1.5, 0]))
      .times(Mat4.scale([1.3, 1.5, 1.1]));

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnie_body,
      this.materials.clothing
    );

    let winnieLeftEar = winnie_transform
      .times(Mat4.translation([-0.8, 0.8, 0]))
      .times(Mat4.scale([0.25, 0.25, 0.1]));

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieLeftEar,
      this.materials.bear_color
    );

    let winnieRightEar = winnie_transform
      .times(Mat4.translation([0.8, 0.8, 0]))
      .times(Mat4.scale([0.25, 0.25, 0.1]));

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieRightEar,
      this.materials.bear_color
    );

    let winnieRightArm = winnie_transform.copy();

    if (this.currentState == this.stateOfGame.started) {
      winnieRightArm = winnieRightArm
        .times(Mat4.translation([0.8, -1, -1.1]))
        .times(Mat4.rotation(181, Vector.of(0, 1, 0)))
        .times(Mat4.rotation(190, Vector.of(0, 0, 1)))
        .times(Mat4.scale([0.4, 1.3, 0.4]));
    } else {
      winnieRightArm = winnieRightArm
        .times(Mat4.translation([0.8, -1, -1.1]))
        .times(Mat4.rotation(181, Vector.of(0, 1, 0)))
        .times(Mat4.rotation(190, Vector.of(0, 0, 1)))
        .times(Mat4.scale([0.4, 1.3, 0.4]));
    }

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieRightArm,
      this.materials.bear_color
    );

    let winnieLeftArm = winnie_transform.copy();

    if (this.batSwinger) {
      winnieLeftArm = winnieLeftArm
        .times(Mat4.translation([-0.8, -1, -1.1]))
        .times(Mat4.rotation(-181, Vector.of(0, 1, 0)))
        .times(Mat4.rotation(190, Vector.of(0, 0, 1)))
        .times(Mat4.scale([0.4, 1.3, 0.4]));
      // .times(Mat4.rotation(t, [0, 1, 0]));
    } else {
      winnieLeftArm = winnieLeftArm
        .times(Mat4.translation([-0.8, -1, -1.1]))
        .times(Mat4.rotation(-181, Vector.of(0, 1, 0)))
        .times(Mat4.rotation(190, Vector.of(0, 0, 1)))
        .times(Mat4.scale([0.4, 1.3, 0.4]));
    }

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieLeftArm,
      this.materials.bear_color
    );

    let winnieLeftLeg = winnie_transform
      .times(Mat4.translation([-0.7, -3, 0]))
      .times(Mat4.scale([0.4, 1, 0.4]));

    if (this.batSwinger) {
      winnieLeftLeg = winnieLeftLeg
        .times(Mat4.translation([1.8, 0, 0]))
        .times(
          Mat4.rotation(0.5 + 0.5 * Math.cos(swing_diff * 9), Vector.of(0, 1, 0))
        )
        .times(Mat4.translation([-1.8, 0, 0]));
    }

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieLeftLeg,
      this.materials.bear_color
    );

    let winnieRightLeg = winnie_transform
      .times(Mat4.translation([0.7, -3, 0]))
      .times(Mat4.scale([0.4, 1, 0.4]));

    if (this.batSwinger) {
      winnieRightLeg = winnieRightLeg
        .times(Mat4.translation([-1.8, 0, 0]))
        .times(
          Mat4.rotation(0.1 + 0.8 * Math.cos(swing_diff * 8.1), Vector.of(0, 1, 0))
        )
        .times(Mat4.translation([1.8, 0, 0]));
    }

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnieRightLeg,
      this.materials.bear_color
    );

    let winnie_nose = winnie_transform
      .times(Mat4.translation([0, 0.3, -1.2]))
      .times(Mat4.rotation(3, Vector.of(0, 1, 0)))
      .times(Mat4.rotation(-0.4, Vector.of(1, 0, 0)))
      .times(Mat4.scale([0.5, 0.5, 0.45]));

    this.shapes.rounded_cone.draw(
      context,
      program_state,
      winnie_nose,
      this.materials.bear_color
    );

    let winnie_nose_tip = winnie_transform
      .times(Mat4.translation([0, 0.4, -1.5]))
      .times(Mat4.scale([0.15, 0.15, 0.2]));

    this.shapes.ball_6.draw(
      context,
      program_state,
      winnie_nose_tip,
      this.materials.dark
    );

    let pitcher_head = mound.copy();

    pitcher_head = pitcher_head
      .times(Mat4.scale([1 / 6, 1 / 3, 1 / 6]))
      .times(Mat4.translation([0, 9.5, 0]))
      .times(Mat4.rotation(15, Vector.of(0, 1, 0)));

    this.shapes.box.draw(
      context,
      program_state,
      pitcher_head,
      this.materials.skin_color
    );

    let face = pitcher_head
      .times(Mat4.translation([-1.7, 1, -0.15]))
      .times(Mat4.scale([2.2, 2.2, 2.2]))
      .times(Mat4.rotation(1, Vector.of(0, 1, 0)));

    this.shapes.plane.draw(
          context,
          program_state,
          face,
          this.materials.asish
    );

    let pitcher_torso = pitcher_head.copy();

    pitcher_torso = pitcher_torso
      .times(Mat4.translation([0, -2.25, 0]))
      .times(Mat4.scale([1, 1.25, 1]));

    this.shapes.box.draw(
      context,
      program_state,
      pitcher_torso,
      this.materials.clothing
    );

    let pitcherLeftLeg = pitcher_torso.copy();

    pitcherLeftLeg = pitcherLeftLeg
      .times(Mat4.scale([1, 1 / 1.25, 1]))
      .times(Mat4.translation([0, -2.75, -0.5]))
      .times(Mat4.scale([1, 1.5, 0.5]));

    this.shapes.box.draw(
      context,
      program_state,
      pitcherLeftLeg,
      this.materials.clothing
    );

    let pitcherRightLeg = pitcher_torso.copy();

    pitcherRightLeg = pitcherRightLeg
      .times(Mat4.scale([1, 1 / 1.25, 1]))
      .times(Mat4.translation([0, -2.75, 0.5]))
      .times(Mat4.scale([1, 1.5, 0.5]));

    this.shapes.box.draw(
      context,
      program_state,
      pitcherRightLeg,
      this.materials.clothing
    );

    let pitcherLeftArm = pitcher_torso.copy();

    pitcherLeftArm = pitcherLeftArm
      .times(Mat4.scale([1, 1, 0.5]))
      .times(Mat4.translation([0, 0, -3]));

    this.shapes.box.draw(
      context,
      program_state,
      pitcherLeftArm,
      this.materials.skin_color
    );

    let pitcherRightArm = pitcher_torso.copy();

    pitcherRightArm = pitcherRightArm
      .times(Mat4.scale([1, 1, 0.5]))
      .times(Mat4.translation([0, 0, 3]));

    this.shapes.box.draw(
      context,
      program_state,
      pitcherRightArm,
      this.materials.skin_color
    );

    let bat = winnie_transform.copy();

    if (this.batSwinger && swing_diff >= Math.PI / 4) {
      this.batSwinger = false;
    }

    if (this.batSwinger) {
      if (swing_diff < Math.PI / 40) {
        bat = bat
          .times(Mat4.translation([0, -1.2, -2]))
          .times(
            Mat4.rotation(
              -0.62 - 0.5 * Math.cos(swing_diff * 15 + Math.PI),
              Vector.of(1, 0, 0)
            )
          )
          .times(
            Mat4.rotation(-1.9 * Math.cos(swing_diff * 15) + 2, Vector.of(0, 1, 0))
          )
          .times(Mat4.translation([0, 1.5, 2]))
          .times(Mat4.translation([0, 1, -2]))
          .times(Mat4.translation([0, -2.3, 0]))
          .times(Mat4.rotation(0.5, Vector.of(1, 0, 0)))
          .times(Mat4.rotation(-0.3, Vector.of(0, 0, 1)))
          .times(Mat4.translation([0, 2.3, 0]))
          .times(Mat4.scale([2.7, 1.5, 2.7]));
      }

      else {
        bat = bat
          .times(Mat4.translation([0, -1.2, -2]))
          .times(Mat4.rotation(-1.12, Vector.of(1, 0, 0)))
          .times(Mat4.rotation(3.9, Vector.of(0, 1, 0)))
          .times(
            Mat4.rotation(
              Math.sin((swing_diff - Math.PI / 12) * 10),
              Vector.of(1, 1, 0)
            )
          )
          .times(Mat4.translation([0, 1.5, 2]))
          .times(Mat4.translation([0, 1, -2]))
          .times(Mat4.translation([0, -2.3, 0]))
          .times(Mat4.rotation(0.5, Vector.of(1, 0, 0)))
          .times(Mat4.rotation(-0.3, Vector.of(0, 0, 1)))
          .times(Mat4.translation([0, 2.3, 0]))
          .times(Mat4.scale([2.7, 1.5, 2.7]));
      }
    } else {
      bat = bat
        .times(Mat4.translation([0, -1.2, -2]))
        .times(Mat4.translation([0, 1.2, 2]))
        .times(Mat4.translation([0, 1, -2]))
        .times(Mat4.translation([0, -2.3, 0]))
        .times(Mat4.rotation(0.5, Vector.of(1, 0, 0)))
        .times(Mat4.rotation(-0.3, Vector.of(0, 0, 1)))
        .times(Mat4.translation([0, 2.3, 0]))
        .times(Mat4.scale([2.7, 1.5, 2.7]));
    }

    this.shapes.bat.draw(context, program_state, bat, this.materials.aluminum);

    let baseball = pitcherRightArm.copy();
    let basketball = pitcherRightArm.copy();

    if (this.bodies.length < 1) {
      this.bodies.push(
        new Body(
          this.shapes.cylinder,
          this.materials.aluminum,
          Vector.of(0.08, 0.08, 0.4)
        ).emplace(
          bat
            .times(Mat4.translation([0, 1, 0]))
            .times(Mat4.rotation(1.5708, Vector.of(1, 0, 0))),
          Vector.of(0, 0, 0),
          0
        )
      );
    }
    if (this.pitch_time && this.bodies.length < 2) {
      this.pitch_timer = t;
      this.pitch_time = false;
    }
    if (
      t > this.pitch_timer + 2 &&
      this.bodies.length < 2 &&
      this.pitchCounter > -1 &&
      this.currentState == this.stateOfGame.started
    ) {
      this.pitch_time = false;
      this.pitchCounter = this.pitchCounter - 1;
      const speed = getRandomInt(10, 18);
      const xy = getRandomInt(-2, 3) * 0.3;
      if (Math.floor(Math.random() * 10) % 2 == 0) {
        this.bodies.push(
            new Body(
                this.shapes.ball_4,
                this.materials.basketball,
                Vector.of(0.5, 0.5, 1)
            ).emplace(
                basketball.times(Mat4.translation([-4, -2, -9])),
                Vector.of(0.4 + xy, 0, speed),
                0
            )
        );
        this.basket_or_base = 1;
      } else {
        this.bodies.push(
            new Body(
                this.shapes.ball_4,
                this.materials.baseball,
                Vector.of(0.5, 0.5, 1)
            ).emplace(
                baseball.times(Mat4.translation([-4, -2, -9])),
                Vector.of(0.4 + xy, 0, speed),
                0
            )
        );
        this.basket_or_base = 0;
      }
    }

    for (let b of this.bodies) {
      if (b.shape == this.shapes.cylinder) {
        b = b.emplace(
          bat
            .times(Mat4.translation([0, 1, 0]))
            .times(Mat4.rotation(1.5708, Vector.of(1, 0, 0))),
          Vector.of(0, 0, 0),
          0
        );
      }
    }

    this.simulate(program_state.animation_delta_time);
    if (this.currentState == this.stateOfGame.started) {
      for (let b of this.bodies) {
        b.shape.draw(context, program_state, b.drawn_location, b.material);
      }
      const { intersect_test, points, leeway } = this.collider;

      if (this.batCollisionDetection) {
        for (let b of this.bodies) {
          if (b.shape == this.shapes.ball_4) {
            this.camera_teleporter.cameras.push(
              Mat4.inverse(
                b.drawn_location
                  .times(Mat4.translation([0, 10, 0]))
                  .times(Mat4.rotation(-Math.PI / 2, Vector.of(0, 1, 0)))
                  .times(Mat4.rotation(-0.55, Vector.of(1, 0, 0)))
                  .times(Mat4.translation([0, 5, 80]))
              )
            );
            this.camera_teleporter.enabled = true;
            this.camera_teleporter.increase();
          }
        }
      }
    }
  }

  update_state(
    dt
  ) {
    throw "Override this";
  }
}

const Additional_Scenes = [];

export {
  Main_Scene,
  Additional_Scenes,
  Canvas_Widget,
  Code_Widget,
  Text_Widget,
  defs
};

const Camera_Teleporter = (defs.Camera_Teleporter = class Camera_Teleporter extends Scene {
  constructor() {
    super();
    this.cameras = [];
    this.selection = 0;
  }
  make_control_panel() {

    this.key_triggered_button("Enable", ["e"], () => (this.enabled = true));
    this.key_triggered_button(
      "Disable",
      ["Shift", "E"],
      () => (this.enabled = false)
    );
    this.new_line();
    this.key_triggered_button("Previous location", ["g"], this.decrease);
    this.key_triggered_button("Next", ["h"], this.increase);
    this.new_line();
    this.live_string(box => {
      box.textContent = "Selected camera location: " + this.selection;
    });
  }
  increase() {
    this.selection = Math.min(
      this.selection + 1,
      Math.max(this.cameras.length - 1, 0)
    );
  }
  decrease() {
    this.selection = Math.max(this.selection - 1, 0);
  }
  display(context, program_state) {
    const desired_camera = this.cameras[this.selection];
    if (!desired_camera || !this.enabled) return;
    const dt = program_state.animation_delta_time;
    program_state.set_camera(
      desired_camera.map((x, i) =>
        Vector.from(program_state.camera_inverse[i]).mix(x, 0.01 * dt)
      )
    );
    program_state.projection_transform = Mat4.perspective(
        Math.PI / 4,
        context.width / context.height,
        1,
        2500
      );
  }
});

class Baseball extends Final_Project {
  constructor() {
    super();
  }
  update_state(dt) {
    if (!this.batCollisionDetection) {
      for (let a of this.bodies) {
        a.inverse = Mat4.inverse(a.drawn_location);
        if (this.basket_or_base == 0){
          a.material = this.materials.baseball;
        } else {
          a.material = this.materials.basketball;
        }
        
        for (let b of this.bodies) {
          if (!a.check_if_colliding(b, this.collider)) continue;

          this.batCollisionDetection = true;
          b.angular_velocity = 0;
        }
      }
    }

    if (this.bodies.length > 1) {
      let ball = this.bodies[1];

      /*********THIS IS AFTER THE BALL IS HIT*************/
      if (this.batCollisionDetection) {
        if (ball.linear_velocity[2] > 0 && this.basket_or_base == 0) {
          ball.linear_velocity[0] = (ball.center[2] + 2) * 6;
          ball.linear_velocity[1] += Math.floor(Math.random() * 21) + 10; //goes airborne!
          ball.linear_velocity[2] *= -Math.min(
            3.6,
            Math.abs(ball.center[2]) * 3
          );
        }

        ball.linear_velocity[1] += dt * -9.8;
        if (ball.center[1] < -9.7 && ball.linear_velocity[1] < 0) {
          if (!this.ballBounceDetection) {
            this.ballBounceDetection = true;
            let x = ball.center[0];
            let z = ball.center[2];
            if (this.basket_or_base == 1) {
              this.currentState = this.stateOfGame.gameOver;
            }
            if (Math.abs(x) < 150 && Math.abs(z) > 160 - Math.abs(x)) {
              //HOMERUN
              this.currentScore++;
              this.sounds.homerun.play();
            } else {
              //NOT HOMERUN
              this.currentScore++;
              this.sounds.booing.play();
              this.sounds.booing2.play();
            }
          }
          ball.linear_velocity[0] *= 0.6;
          ball.linear_velocity[1] *= -0.6;
          ball.linear_velocity[2] *= 0.6;
          ball.angular_velocity *= 0.5;
        }

        if (ball.linear_velocity.norm() < 2 && ball.center[1] < -9.7)
          ball.linear_velocity[1] = 0;
      }

      if (this.batCollisionDetection) {
        this.bodies = this.bodies.filter(b => {
          if (b.center.norm() < 300) {
            this.pitch_time = true;
          }
          return b.center.norm() < 300;
        });
        for (let b of this.bodies) {
          if (b.center.norm() < 90) this.camera_teleporter.decrease();
        }
      } else {
        this.bodies = this.bodies.filter(b => b.center.norm() < 40);
      }

      if (this.bodies.length < 2) {
        this.batCollisionDetection = false;
        this.ballBounceDetection = false;
      } else {
        if (ball.linear_velocity.every(v => Math.abs(v) < 0.5)) {
          this.batCollisionDetection = false;
          this.ballBounceDetection = false;
          this.bodies.pop();
        }
      }
    }

  }
}

const Main_Scene = Baseball;
