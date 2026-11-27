// Linux counterpart of `src-win`. Opens a window titled with the game name so Discord's
// game detection sees a running game. Mirrors src-win's `--title` / `--tray` args and
// runs until the window is closed (or the parent sends SIGTERM via `kill`).
use std::time::Duration;

fn parse_args() -> (String, bool) {
    let args: Vec<String> = std::env::args().collect();
    let mut title = String::from("Discord Quest App");
    let mut start_hidden = false;
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--title" => {
                if i + 1 < args.len() {
                    title = args[i + 1].clone();
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "--tray" => {
                start_hidden = true;
                i += 1;
            }
            _ => i += 1,
        }
    }
    (title, start_hidden)
}

fn main() {
    let (title, start_hidden) = parse_args();

    let sdl = sdl2::init().expect("failed to initialise SDL2");
    let video = sdl.video().expect("failed to initialise SDL2 video");
    let mut window = video
        .window(&title, 400, 400)
        .position_centered()
        .resizable()
        .build()
        .expect("failed to create window");

    if start_hidden {
        window.hide();
    }

    let mut pump = sdl.event_pump().expect("failed to get SDL2 event pump");
    'running: loop {
        for event in pump.poll_iter() {
            if let sdl2::event::Event::Quit { .. } = event {
                break 'running;
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}
