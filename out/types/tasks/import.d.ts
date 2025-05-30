/**
 * Imports all xml files needed for atscm usage.
 * @return {Promise<void>} The running task.
 */
declare function importTask(): Promise<void>;
declare namespace importTask {
    let description: string;
}
export default importTask;
