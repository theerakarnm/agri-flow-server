import type { Response, Request } from 'express';
import type { IGetUserAuthInfoRequest, UserJwtPayload } from '@type/jwt'
import axios, { AxiosError } from 'axios'
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'
dotenv.config()

import { httpStatus } from '@config/http';
import defaultValue from '@config/defaultValue';
import { validateSchema } from '@helper/validateSchema';
import * as schema from '@model/ajvSchema'
import * as blogService from '@service/blog/person/blog-service'
import moment from 'moment';
import { client } from '@config/redisConnect';
import { _getOne, _getOneAll } from '@service/user-service';
import { _getAll, _getById } from '@service/category-service';
import { _add } from '@service/blog/person/comment-service';

export const newComment = async (req: IGetUserAuthInfoRequest, res: Response) => {
  try {

    const data = req.body as {
      content: string
      blogId: number,
    }

    if (!req.jwtObject) return res.send({
      msg: 'Access denied unauthorized.'
    })

    const userObjJWT = req.jwtObject as UserJwtPayload;

    const { success, msg } = validateSchema(schema.newPostSchema, data)

    if (!success) return res.status(httpStatus.badRequest).send({ msg })

    const response = await _add({ content: data.content, blogId: data.blogId, author: userObjJWT.username })

    if (!response.success) return res.status(httpStatus.internalServerError).send({ msg: response.msg })

    res.sendStatus(httpStatus.created)

  } catch (error) {
    console.error(error)
    return res.sendStatus(httpStatus.internalServerError)
  }
}