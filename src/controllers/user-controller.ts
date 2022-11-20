import type { Request, Response } from 'express';
import axios, { AxiosError } from 'axios'
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'
dotenv.config()

import { httpStatus } from '@config/http';
import defaultValue from '@config/defaultValue';
import { validateSchema } from '@helper/validateSchema';
import * as schema from '@model/ajvSchema';
import * as userService from '@service/user-service';
import { Prisma } from '@prisma/client';
import { decodePassword } from '@util/DecryptEncryptString';
import { client, connectClient, quitClient } from '@config/redisConnect';
import sendEmail from '@helper/sendMail';
import { IGetUserAuthInfoRequest, UserJwtPayload } from '@type/jwt';

const getOne = async (req: Request, res: Response) => {
  try {

    const { userUsername } = req.params

    const user = await userService._getOne({ username: userUsername })

    if (!user.success) return res.status(httpStatus.internalServerError).send(user)

    // await connectClient()

    if (!user.data) return res.send(user)

    await client.setEx(`userUsername-${userUsername}`, 3600, JSON.stringify(user.data))

    res.send({ ...user, saveCache: true })

  } catch (e) {
    console.error(e);
    return res.sendStatus(httpStatus.internalServerError)

  } finally {
    // await quitClient()
  }
}

const follow = async (req: IGetUserAuthInfoRequest, res: Response) => {
  try {

    const { username } = req.body

    const valid = validateSchema(schema.follow, { username })

    if (!valid.success) return res.status(httpStatus.badRequest).send({ msg: valid.msg })

    const userObjJWT = req.jwtObject as UserJwtPayload;

    if (username === userObjJWT.username) return res.status(httpStatus.badRequest).send({
      msg: 'can not follow yourself'
    })

    const response = await userService._addFollow({ who: username, author: userObjJWT.username })

    if (!response.success) return res.status(httpStatus.badRequest).send({ msg: response.msg })

    res.sendStatus(httpStatus.created)

  } catch (e) {
    return res.sendStatus(httpStatus.internalServerError)

  }
}


export {
  getOne,
  follow
}
