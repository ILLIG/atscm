export function waitForDependencies(Stream: QueueStream): Class<WaitingStream>;
/**
 * A {@link QueueStream} that waits for a file's dependencies to be processed before the file is
 * processed itself.
 * @abstract
 */
export default class WaitingStream {
}
import QueueStream from './QueueStream';
