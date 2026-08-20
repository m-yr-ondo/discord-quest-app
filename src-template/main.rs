use std::thread;
use std::time::Duration;

fn main() {
    println!("Discord status app started");
    println!("This application is now running in the background");
    println!("You can now select this app in Discord to show custom status");
    
    loop {
        thread::sleep(Duration::from_secs(10));
    }
}
