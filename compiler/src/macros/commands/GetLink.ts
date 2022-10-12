import { InstructionBase } from "../../instructions";
import { MacroFunction } from "..";
import { IValue } from "../../types";
import { LiteralValue, SenseableValue, StoreValue } from "../../values";
import { CompilerError } from "../../CompilerError";

export class GetLink extends MacroFunction {
  constructor() {
    super((scope, index: IValue) => {
      if (
        !(index instanceof StoreValue) &&
        (!(index instanceof LiteralValue) || typeof index.data !== "number")
      )
        throw new CompilerError(
          "The getlink index must be a number literal or a store"
        );
      const outBuild = new SenseableValue(scope);
      return [outBuild, [new InstructionBase("getlink", outBuild, index)]];
    });
  }
}
