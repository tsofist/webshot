import ShooterImpl from "./Schooter";
import { ShotFormat, ShooterOptions, Shooter } from "./typings";

export {
    ShotFormat, Shooter,
    startupShooter
};

function startupShooter(options: ShooterOptions = {},
                        environment: Object&object = {}): Promise<Shooter> {
    return ShooterImpl.startup(options, environment);
}